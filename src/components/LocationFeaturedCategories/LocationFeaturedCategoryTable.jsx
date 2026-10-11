import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useDownloadExcel } from "react-export-table-to-excel";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  deleteLocationFeaturedCategory,
  toggleLocationFeaturedCategoryStatus,
} from "../../api";

const LocationFeaturedCategoryTable = ({
  triggerDownloadExcel,
  triggerDownloadPDF,
  tableHeaders,
  datas,
  text,
  onDeleted,
  loading,
}) => {
  const tableRef = useRef(null);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const { onDownload } = useDownloadExcel({
    currentTableRef: tableRef.current,
    filename: "Location_Featured_Categories",
    sheet: "LocationFeaturedCategories",
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Location Based Featured Categories", 14, 10);
    doc.autoTable({ html: "#lfc-table", startY: 20, theme: "striped" });
    doc.save(`${text}.pdf`);
  };

  triggerDownloadExcel.current = onDownload;
  triggerDownloadPDF.current = exportToPDF;

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return datas;
    const term = searchTerm.toLowerCase();
    return datas.filter((item) =>
      [item.categoryName, item.locationName, item.address, item.status].some(
        (field) => field?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, datas]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const currentData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage]);

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This location featured category will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteLocationFeaturedCategory(id);
          onDeleted();
        } catch (error) {
          // error Swal already shown by API function
        }
      }
    });
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleLocationFeaturedCategoryStatus(id);
      onDeleted();
    } catch (error) {
      // error Swal already shown by API function
    }
  };

  const statusBadge = (status) => (
    <span
      className={`badge ${status === "active" ? "bg-success" : "bg-secondary"}`}
      style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 20 }}
    >
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );

  return (
    <div className="row">
      <div className="col-sm-12">
        <div className="card-table card p-2">
          <div className="card-body">
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Search by category name, location or status..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="table-responsive">
              <table ref={tableRef} id="lfc-table" className="table table-striped">
                <thead>
                  <tr>
                    {tableHeaders.map((header, index) => (
                      <th
                        key={index}
                        style={{
                          backgroundColor: "#2e83ff",
                          color: "#fff",
                          whiteSpace: "nowrap",
                          borderColor: "#2e83ff",
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
                        <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <div className="mt-2">Loading...</div>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={tableHeaders.length} className="text-center py-5">
                        <div className="d-flex flex-column align-items-center text-muted">
                          <i className="fa fa-map-marker-alt mb-3" style={{ fontSize: "2rem", color: "#adb5bd" }}></i>
                          <h6 className="mb-1" style={{ fontWeight: 600 }}>No Records Found</h6>
                          <p style={{ fontSize: "0.9rem", color: "#6c757d", margin: 0 }}>
                            Add a location featured category to get started.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentData.map((item, index) => (
                      <tr key={item._id}>
                        <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                        <td>
                          {item.categoryImage ? (
                            <img
                              src={item.categoryImage}
                              alt={item.categoryName}
                              style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 48, height: 48, borderRadius: 6,
                                background: "#e2e8f0", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                color: "#94a3b8", fontSize: 18,
                              }}
                            >
                              <i className="fa fa-image" />
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 500 }}>{item.categoryName}</td>
                        <td style={{ fontWeight: 500 }}>
                          {item.serviceId?.name || item.serviceId || "—"}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{item.locationName}</div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{item.address}</div>
                        </td>
                        <td>
                          <span className="badge bg-primary" style={{ borderRadius: 20 }}>
                            {item.radius} KM
                          </span>
                        </td>
                        <td>{statusBadge(item.status)}</td>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td className="d-flex align-items-center">
                          <div className="dropdown">
                            <button type="button" className="btn-action-icon" data-bs-toggle="dropdown" aria-expanded="false">
                              <i className="fas fa-ellipsis-v" />
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end">
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() => navigate(`/location-featured-categories/view/${item._id}`)}
                                >
                                  <i className="far fa-eye me-2" /> View
                                </button>
                              </li>
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() => navigate(`/location-featured-categories/edit/${item._id}`)}
                                >
                                  <i className="far fa-edit me-2" /> Edit
                                </button>
                              </li>
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() => handleToggleStatus(item._id)}
                                >
                                  <i className={`far ${item.status === "active" ? "fa-times-circle" : "fa-check-circle"} me-2`} />
                                  {item.status === "active" ? "Deactivate" : "Activate"}
                                </button>
                              </li>
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() => handleDelete(item._id)}
                                >
                                  <i className="far fa-trash-alt me-2" /> Delete
                                </button>
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted">
                Total Records: <span className="fw-bold text-primary">{filteredData.length}</span>
              </div>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>&laquo;</button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <li key={pageNum} className={`page-item ${pageNum === currentPage ? "active" : ""}`}>
                      <button className="page-link" onClick={() => setCurrentPage(pageNum)}>{pageNum}</button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage >= totalPages || totalPages === 0 ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>&raquo;</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationFeaturedCategoryTable;
