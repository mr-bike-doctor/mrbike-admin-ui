"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Swal from "sweetalert2"
import { useDownloadExcel } from "react-export-table-to-excel"
import jsPDF from "jspdf"
import "jspdf-autotable"
import ImagePreview from "../Global/ImagePreview"
import ImageCropDialog from "../Common/ImageCropDialog"
import { BANNER_IMAGE_SPECS, formatSpec, optimizeBannerImage, validateBannerImage } from "../../utils/bannerImageSpecs"
import { deleteBanner, updateBanner, getBaseServiceList } from "../../api"

// Legacy banners land on the app's home slider, so they share the Home Hero
// spec the create form enforces — an edit must not be able to sneak an
// off-size image past the gate the create form applies.
const HOME_SPEC = BANNER_IMAGE_SPECS.home

const IMAGE_BASE_URL = process.env.REACT_APP_IMAGE_BASE_URL
const bannerImageUrl = (value) => /^https?:\/\//i.test(value || "") ? value : `${IMAGE_BASE_URL || ""}${value || ""}`

const GOOGLE_MAPS_KEY = "AIzaSyCM15ry8lewwj6YZ-04_m7Z58dsQo_hBBA"

const loadGoogleMapsScript = (onReady) => {
  if (window.google?.maps?.places) { onReady(); return }
  if (document.querySelector("script[data-gmaps]")) {
    const wait = setInterval(() => {
      if (window.google?.maps?.places) { clearInterval(wait); onReady() }
    }, 100)
    return
  }
  window.__gmapsCallback = () => { delete window.__gmapsCallback; onReady() }
  const script = document.createElement("script")
  script.setAttribute("data-gmaps", "1")
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&callback=__gmapsCallback`
  script.async = true
  document.head.appendChild(script)
}

const BannerTable = ({
  triggerDownloadExcel,
  triggerDownloadPDF,
  tableHeaders,
  datas,
  text,
  onBannerDeleted,
  loading,
}) => {
  const tableRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    _id: "",
    name: "",
    banner_image: "",
    from_date: "",
    expiry_date: "",
    baseServiceId: "",
    locationType: "all",
    placeId: "",
    placeName: "",
    latitude: "",
    longitude: "",
    radius: "",
    displayOrder: "0",
    imageOnly: false,
  })
  const [editLoading, setEditLoading] = useState(false)
  // A newly picked replacement image — null means "keep the saved artwork".
  const [newImage, setNewImage] = useState(null)
  const [newImagePreview, setNewImagePreview] = useState(null)
  // The picked file waiting to be cropped — also the crop dialog's open flag.
  const [cropSource, setCropSource] = useState(null)
  const [imageError, setImageError] = useState(null)
  const [services, setServices] = useState([])
  const [editLocationQuery, setEditLocationQuery] = useState("")
  const [googleReady, setGoogleReady] = useState(!!window.google?.maps?.places)
  const editSearchInputRef = useRef(null)
  const editAutocompleteRef = useRef(null)

  useEffect(() => {
    getBaseServiceList()
      .then((res) => { if (res?.data) setServices(res.data) })
      .catch(() => {})
  }, [])

  // Load Google Maps only when the modal is open and "Specific" location is selected
  useEffect(() => {
    if (!showEditModal || editFormData.locationType !== "specific") {
      editAutocompleteRef.current = null
      return
    }
    loadGoogleMapsScript(() => setGoogleReady(true))
  }, [showEditModal, editFormData.locationType])

  useEffect(() => {
    if (!googleReady || !showEditModal || editFormData.locationType !== "specific" || !editSearchInputRef.current || editAutocompleteRef.current) return
    editAutocompleteRef.current = new window.google.maps.places.Autocomplete(
      editSearchInputRef.current,
      { fields: ["place_id", "geometry", "name", "formatted_address"] }
    )
    editAutocompleteRef.current.addListener("place_changed", () => {
      const place = editAutocompleteRef.current.getPlace()
      if (!place?.geometry) return
      const name = place.name || editSearchInputRef.current.value
      setEditLocationQuery(name)
      setEditFormData((prev) => ({
        ...prev,
        placeId: place.place_id || "",
        placeName: name,
        latitude: String(place.geometry.location.lat()),
        longitude: String(place.geometry.location.lng()),
      }))
    })
  }, [googleReady, showEditModal, editFormData.locationType])

  // "Image already has text" turns the app's own overlay off, so the artwork
  // has to be the finished creative — and the crop dialog must stop shading the
  // bottom of the frame as if the app were going to paint text there.
  const imageSpec = useMemo(
    () =>
      editFormData.imageOnly
        ? {
            ...HOME_SPEC,
            note: "Finished creative — the app shows this image alone, with no title, description or button over it. Keep important content away from the rounded corners.",
            overlayBottomPct: 0,
          }
        : HOME_SPEC,
    [editFormData.imageOnly]
  )

  useEffect(() => {
    if (!newImage) {
      setNewImagePreview(null)
      return
    }
    const url = URL.createObjectURL(newImage)
    setNewImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [newImage])

  const { onDownload } = useDownloadExcel({
    currentTableRef: tableRef.current,
    filename: "Banner_List",
    sheet: "Banners",
  })

  console.log("BannerTable rendered with datas:", datas)

  const handleEdit = (banner) => {
    setEditFormData({
      _id: banner._id,
      name: banner.name || "",
      banner_image: banner.banner_image || "",
      from_date: banner.from_date ? new Date(banner.from_date).toISOString().split("T")[0] : "",
      expiry_date: banner.expiry_date ? new Date(banner.expiry_date).toISOString().split("T")[0] : "",
      baseServiceId: banner.baseServiceId?._id || banner.baseServiceId || "",
      locationType: banner.locationType || "all",
      placeId: banner.placeId || "",
      placeName: banner.placeName || "",
      latitude: banner.latitude != null ? String(banner.latitude) : "",
      longitude: banner.longitude != null ? String(banner.longitude) : "",
      radius: banner.radius != null ? String(banner.radius) : "",
      displayOrder: banner.displayOrder != null ? String(banner.displayOrder) : "0",
      imageOnly: banner.imageOnly === true,
    })
    setEditLocationQuery(banner.placeName || "")
    setNewImage(null)
    setCropSource(null)
    setImageError(null)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setNewImage(null)
    setCropSource(null)
    setImageError(null)
  }

  // Same gate as the create form: type, weight and exact pixel size. An
  // off-size file is not bounced — the admin crops it here, so they decide
  // what gets cut off rather than the app's fixed-height card deciding for them.
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    // Reset so re-picking the same rejected file fires onChange again.
    e.target.value = ""
    if (!file) return

    const result = await validateBannerImage(file, imageSpec)
    if (result.needsCrop) {
      setNewImage(null)
      setImageError(null)
      setCropSource(file)
      return
    }
    if (!result.ok) {
      setNewImage(null)
      setImageError(result.message)
      Swal.fire({ icon: "error", title: "Image Not Accepted", text: result.message })
      return
    }

    try {
      const optimized = await optimizeBannerImage(file, imageSpec)
      setImageError(null)
      setNewImage(optimized)
    } catch (error) {
      const message = error.message || "Could not optimize this image."
      setImageError(message)
      Swal.fire({ icon: "error", title: "Image Not Accepted", text: message })
    }
  }

  const handleCropped = (croppedFile) => {
    setCropSource(null)
    setImageError(null)
    setNewImage(croppedFile)
  }

  const handleCropCancel = () => {
    const pending = cropSource
    setCropSource(null)
    if (!newImage && pending) {
      setImageError(`Crop cancelled — the banner must be exactly ${formatSpec(imageSpec)}. Choose the image again to crop it.`)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setEditFormData((prev) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value }
      if (name === "locationType" && value === "all") {
        updated.placeId = ""
        updated.placeName = ""
        updated.latitude = ""
        updated.longitude = ""
        updated.radius = ""
      }
      return updated
    })
    if (name === "locationType" && value === "all") setEditLocationQuery("")
  }

  const handleEditLocationQueryChange = (e) => {
    const val = e.target.value
    setEditLocationQuery(val)
    if (!val.trim()) {
      setEditFormData((prev) => ({ ...prev, placeId: "", placeName: "", latitude: "", longitude: "" }))
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()

    if (!editFormData.name.trim()) {
      Swal.fire("Error!", "Banner name is required.", "error")
      return
    }

    if (!editFormData.from_date || !editFormData.expiry_date) {
      Swal.fire("Error!", "From date and expiry date are required.", "error")
      return
    }

    if (new Date(editFormData.from_date) >= new Date(editFormData.expiry_date)) {
      Swal.fire("Error!", "From date must be before the expiry date.", "error")
      return
    }

    if (editFormData.locationType === "specific") {
      const { placeName, latitude, longitude, radius } = editFormData
      if (!placeName || !latitude || !longitude || !radius || isNaN(Number(radius)) || Number(radius) <= 0) {
        Swal.fire("Error!", "Please select a location and enter a valid radius.", "error")
        return
      }
    }

    const fields = {
      name: editFormData.name,
      from_date: editFormData.from_date,
      expiry_date: editFormData.expiry_date,
      baseServiceId: editFormData.baseServiceId,
      locationType: editFormData.locationType,
      placeId: editFormData.placeId,
      placeName: editFormData.placeName,
      latitude: editFormData.latitude,
      longitude: editFormData.longitude,
      radius: editFormData.radius,
      displayOrder: editFormData.displayOrder,
      imageOnly: editFormData.imageOnly,
    }

    // A replacement image makes this a multipart update under the same "images"
    // field the create form uses; with no new file the saved artwork is sent
    // back untouched as JSON.
    let payload
    if (newImage) {
      payload = new FormData()
      Object.entries(fields).forEach(([key, value]) => payload.append(key, String(value ?? "")))
      payload.append("images", newImage)
    } else {
      payload = { ...fields, banner_image: editFormData.banner_image }
    }

    setEditLoading(true)
    try {
      await updateBanner(editFormData._id, payload)
      closeEditModal()
      onBannerDeleted() // Refresh the list
    } catch (error) {
      // error Swal already shown by updateBanner()
    } finally {
      setEditLoading(false)
    }
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.text("Banner List", 14, 10)

    const table = tableRef.current
    if (!table) {
      console.error("Table not found!")
      return
    }

    doc.autoTable({
      html: "#example",
      startY: 20,
      theme: "striped",
    })

    doc.save(`${text}.pdf`)
  }

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return datas
    return datas.filter((item) =>
      [item.name, item._id].some((field) => field?.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [searchTerm, datas])

  const handleDelete = async (bannerId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await deleteBanner(bannerId)
          if (response.status === 200) {
            // Remove deleted dealer from state
            const updatedData = datas.filter((banner) => banner._id !== bannerId)
            datas.splice(0, datas.length, ...updatedData) // Update parent state
            onBannerDeleted()
            Swal.fire("Deleted!", response.message || "Banner deleted successfully.", "success")
          } else {
            Swal.fire("Error!", response.message || "Deletion failed.", "error")
          }
        } catch (error) {
          Swal.fire("Error!", "Failed to delete banner.", "error")
        }
      }
    })
  }

  const rowsPerPage = 10

  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

  const currentData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredData.slice(start, start + rowsPerPage)
  }, [filteredData, currentPage, rowsPerPage])

  triggerDownloadExcel.current = onDownload
  triggerDownloadPDF.current = exportToPDF

  const memoizedBannerList = useMemo(() => {
    return currentData.map((data, index) => (
      <tr key={data._id}>
        <td>{index + 1}</td>
        <td>{data.bannerId || "N/A"}</td>
        <td>{data.name || "N/A"}</td>
        <td>{data.baseServiceId?.name || "N/A"}</td>
        <td>{data.displayOrder ?? 0}</td>
        <td>{data.banner_image ? <ImagePreview image={bannerImageUrl(data.banner_image)} /> : "N/A"}</td>
        <td>{data.from_date ? new Date(data.from_date).toLocaleDateString() : "N/A"}</td>
        <td>{data.expiry_date ? new Date(data.expiry_date).toLocaleDateString() : "N/A"}</td>
        <td>{new Date(data.createdAt).toLocaleDateString()}</td>
        <td>{new Date(data.updatedAt).toLocaleDateString()}</td>
        <td>
          <div className="dropdown d-flex justify-content-center position-static">
            <button
              type="button"
              className="btn dropdown-toggle p-0 d-inline-flex align-items-center justify-content-center"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label={`Actions for ${data.name || "banner"}`}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid #dbe3ef",
                background: "#fff",
                color: "#334155",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
              }}
            >
              <i className="fas fa-ellipsis-v" aria-hidden="true" />
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.preventDefault()
                    handleEdit(data)
                  }}
                >
                  <i className="far fa-edit me-2" /> Edit
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.preventDefault()
                    handleDelete(data._id)
                  }}
                >
                  <i className="far fa-trash-alt me-2" /> Delete
                </button>
              </li>
            </ul>
          </div>
        </td>
      </tr>
    ))
  }, [currentData])

  return (
    <>
      <div className="row">
        <div className="col-sm-12">
          <div className="card-table card p-2" style={{ overflow: "visible" }}>
            <div className="card-body" style={{ minWidth: 0 }}>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by promo code, service or discount"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="table-responsive" style={{ overflowX: "auto", overflowY: "visible" }}>
                <table
                  ref={tableRef}
                  id="example"
                  className="table table-striped align-middle mb-0"
                  style={{ minWidth: 1180 }}
                >
                  <thead>
                    <tr>
                      {tableHeaders.map((header, index) => (
                        <th
                          key={index}
                          scope="col"
                          style={{
                            backgroundColor: "#eff6ff",
                            color: "#1e3a5f",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            borderBottom: "1px solid #bfdbfe",
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="list">
                    {loading ? (
                      <tr>
                        <td colSpan={tableHeaders.length} className="text-center py-5">
                          <div
                            className="spinner-border text-primary"
                            role="status"
                            style={{ width: "3rem", height: "3rem" }}
                          >
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <div className="mt-2">Loading Banners...</div>
                        </td>
                      </tr>
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={tableHeaders.length} className="text-center py-5">
                          <div className="d-flex flex-column align-items-center text-muted">
                            <i className="fa fa-box-open mb-3" style={{ fontSize: "2rem", color: "#adb5bd" }}></i>
                            <h6 className="mb-1" style={{ fontWeight: 600 }}>
                              No Banners Found
                            </h6>
                            <p style={{ fontSize: "0.9rem", color: "#6c757d", margin: 0 }}>Add a new banner.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      memoizedBannerList
                    )}
                  </tbody>
                </table>
              </div>
              <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center mt-3">
                <div className="text-muted">
                  Total Records: <span className="fw-bold text-primary">{filteredData.length}</span>
                </div>

                <nav aria-label="Page navigation example">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        aria-label="Previous"
                      >
                        &laquo;
                      </button>
                    </li>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <li
                        key={pageNum}
                        className={`page-item ${pageNum === currentPage ? "active" : ""}`}
                        aria-current={pageNum === currentPage ? "page" : undefined}
                      >
                        <button className="page-link" onClick={() => setCurrentPage(pageNum)}>
                          {pageNum}
                        </button>
                      </li>
                    ))}

                    <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                      <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)} aria-label="Next">
                        &raquo;
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showEditModal && (
        <div
          className="modal fade show d-block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-banner-title"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.58)",
            zIndex: 2000,
            overflowX: "hidden",
            overflowY: "hidden",
            padding: "12px",
            boxSizing: "border-box",
          }}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-scrollable"
            style={{
              maxWidth: 760,
              width: "100%",
              height: "100%",
              minHeight: 0,
              margin: "0 auto",
            }}
          >
            <div className="modal-content" style={{ height: "100%", maxHeight: "100%", border: 0, borderRadius: 16 }}>
              <div className="modal-header bg-primary text-white">
                <h5 id="edit-banner-title" className="modal-title text-white">Edit Banner</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closeEditModal}
                  disabled={editLoading}
                ></button>
              </div>
              {/* The form sits between .modal-content and .modal-body, which
                  breaks Bootstrap's scrollable-modal flex chain: the body ends
                  up with no bounded height, so it grows past the content box
                  instead of scrolling and the overflow is simply clipped.
                  Carry the column layout through the form to restore it. */}
              <form
                onSubmit={handleEditSubmit}
                style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}
              >
                <div
                  className="modal-body"
                  style={{ overflowX: "hidden", overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}
                >
                  {editLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Banner Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="name"
                          value={editFormData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">From Date</label>
                          <input
                            type="date"
                            className="form-control"
                            name="from_date"
                            value={editFormData.from_date}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Expiry Date</label>
                          <input
                            type="date"
                            className="form-control"
                            name="expiry_date"
                            value={editFormData.expiry_date}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Banner Image</label>
                        <div className="alert alert-info py-2 px-3 mb-2" role="alert">
                          <strong>Required size: {formatSpec(imageSpec)}</strong> — any other size opens the crop tool.
                          <br />
                          <small>{imageSpec.note}</small>
                        </div>
                        <input
                          type="file"
                          className={`form-control mb-2 ${imageError ? "is-invalid" : ""}`}
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageSelect}
                        />
                        <small className="text-muted d-block mb-2">
                          Leave this empty to keep the current image.
                        </small>
                        {imageError && <div className="invalid-feedback d-block">{imageError}</div>}
                        {(newImagePreview || editFormData.banner_image) && (
                          <div className="border rounded p-2 bg-light text-center">
                            <img
                              src={newImagePreview || bannerImageUrl(editFormData.banner_image)}
                              alt="Banner Preview"
                              style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" }}
                            />
                            <div className="mt-2">
                              {newImage ? (
                                <>
                                  <span className="badge bg-success me-2">New image · {formatSpec(imageSpec)}</span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary me-2"
                                    onClick={() => setCropSource(newImage)}
                                  >
                                    Adjust crop
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => { setNewImage(null); setImageError(null) }}
                                  >
                                    Keep current image
                                  </button>
                                </>
                              ) : (
                                <span className="badge bg-secondary">Current image</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mb-3 border rounded p-3">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="editBannerImageOnly"
                            name="imageOnly"
                            checked={editFormData.imageOnly}
                            onChange={handleInputChange}
                          />
                          <label className="form-label fw-bold mb-0" htmlFor="editBannerImageOnly">
                            Image already has text
                          </label>
                        </div>
                        <small className="text-muted d-block mt-1">
                          On: the app hides its dark gradient, title and Bike Service button, and
                          shows your creative as-is. Turn this on for ready-made posters.
                        </small>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Linked Service (optional)</label>
                        <select
                          className="form-control"
                          name="baseServiceId"
                          value={editFormData.baseServiceId}
                          onChange={handleInputChange}
                        >
                          <option value="">-- No Service Linked --</option>
                          {services.map((s) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Location Type</label>
                        <select
                          className="form-control"
                          name="locationType"
                          value={editFormData.locationType}
                          onChange={handleInputChange}
                        >
                          <option value="all">All Locations</option>
                          <option value="specific">Specific Location</option>
                        </select>
                      </div>

                      {editFormData.locationType === "specific" && (
                        <div className="mb-3 border rounded p-3">
                          <label className="form-label">Search Location</label>
                          <input
                            ref={editSearchInputRef}
                            type="text"
                            className="form-control mb-2"
                            placeholder={googleReady ? "Type to search a place..." : "Loading Google Maps..."}
                            value={editLocationQuery}
                            onChange={handleEditLocationQueryChange}
                            disabled={!googleReady}
                          />
                          <div className="row">
                            <div className="col-md-4 mb-2">
                              <label className="form-label">Latitude</label>
                              <input type="text" className="form-control" value={editFormData.latitude} readOnly />
                            </div>
                            <div className="col-md-4 mb-2">
                              <label className="form-label">Longitude</label>
                              <input type="text" className="form-control" value={editFormData.longitude} readOnly />
                            </div>
                            <div className="col-md-4 mb-2">
                              <label className="form-label">Radius (km)</label>
                              <input
                                type="number"
                                name="radius"
                                className="form-control"
                                value={editFormData.radius}
                                onChange={handleInputChange}
                                min="0.1"
                                step="0.5"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label">Display Order</label>
                        <input
                          type="number"
                          name="displayOrder"
                          className="form-control"
                          value={editFormData.displayOrder}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer" style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeEditModal}
                    disabled={editLoading}
                  >
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={editLoading}>
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ImageCropDialog
        open={Boolean(cropSource)}
        file={cropSource}
        spec={imageSpec}
        zIndex={2100}
        onCancel={handleCropCancel}
        onCropped={handleCropped}
      />
    </>
  )
}

export default BannerTable
