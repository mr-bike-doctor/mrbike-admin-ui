import React, { useState, useMemo, useRef } from "react";
import { useDownloadExcel } from "react-export-table-to-excel";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import "jspdf-autotable";
import ImagePreview from "../Global/ImagePreview";
import { deleteOffers } from "../../api";
import { useNavigate } from "react-router-dom";

const OfferTable = ({ triggerDownloadExcel, triggerDownloadPDF, tableHeaders, datas, text, onOfferDeleted, loading }) => {
  const tableRef = useRef(null);
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const { onDownload } = useDownloadExcel({
    currentTableRef: tableRef.current,
    filename: "Offer_List",
    sheet: "Offers",
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Offer List", 14, 10);
    doc.autoTable({ html: "#example", startY: 20, theme: "striped" });
    doc.save(`${text}.pdf`);
  };

  triggerDownloadExcel.current = onDownload;
  triggerDownloadPDF.current = exportToPDF;

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return datas.filter(data =>
      data.promo_code?.toLowerCase().includes(term) ||
      data.service_id?.name?.toLowerCase().includes(term) ||
      data.discount?.toString().includes(term)
    );
  }, [datas, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const currentData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage]);

  const handleDelete = async (offerId) => {
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
          const response = await deleteOffers(offerId);
          if (response.status === 200) {
            const updatedData = datas.filter(
              (offer) => offer._id !== offerId
            );
            datas.splice(0, datas.length, ...updatedData);
            onOfferDeleted();
            Swal.fire(
              "Deleted!",
              response.message || "Offer deleted successfully.",
              "success"
            );
          } else {
            Swal.fire(
              "Error!",
              response.message || "Deletion failed.",
              "error"
            );
          }
        } catch (error) {
          Swal.fire("Error!", "Failed to delete offer.", "error");
        }
      }
    });
  };

  const memoizedRowList = currentData.map((data, index) => (
    <tr key={data._id}>
      <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
      <td>{data.offerId || "N/A"}</td>
      <td>{data.promo_code}</td>
      <td>{data.service_id?.name || "N/A"}</td>
      <td>{data?.service_id?.image ? <ImagePreview image={data.service_id.image} /> : "N/A"}</td>
      <td>{data.discount || 0}%</td>
      <td>₹{data.minorderamt || 0}</td>
      {/* <td>{new Date(data.start_date).toLocaleDateString()}</td>
      <td>{new Date(data.end_date).toLocaleDateString()}</td> */}
      {(() => {
        const now = new Date();
        const endDate = new Date(data.end_date);
        const isExpired = endDate < now;

        return (
          <>
            <td>
              {isExpired ? (
                <span className="text-danger fw-bold">Offer Finished</span>
              ) : (
                new Date(data.start_date).toLocaleDateString()
              )}
            </td>
            <td>
              {isExpired ? (
                <span className="text-danger fw-bold">Offer Finished</span>
              ) : (
                new Date(data.end_date).toLocaleDateString()
              )}
            </td>
          </>
        );
      })()}

      <td className="d-flex align-items-center">
        <div className="dropdown">
          <button type="button" className="btn-action-icon" data-bs-toggle="dropdown" aria-expanded="false">
            <i className="fas fa-ellipsis-v" />
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <button
                className="dropdown-item"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/updateDealer/${data._id}`);
                }}
              >
                <i className="far fa-edit me-2" /> Edit
              </button>
            </li>
            <li>
              <button
                className="dropdown-item"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(data._id);
                }}
              >
                <i className="far fa-trash-alt me-2" /> Delete
              </button>
            </li>
            <li>
              <button
                className="dropdown-item"
                onClick={(e) => e.preventDefault()}
              >
                <i className="fa fa-eye me-2" /> View Permission
              </button>
            </li>
            <li>
              <button
                className="dropdown-item"
                onClick={(e) => e.preventDefault()}
              >
                <i className="fa fa-plus me-2" /> Give Permission
              </button>
            </li>
          </ul>
        </div>
      </td>
    </tr>
  ));

  return (
    <div className="row">
      <div className="col-sm-12">
        <div className="card-table card p-2">
          <div className="card-header bg-white">
            <h5 className="mb-0">{text} List</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Search by promo code, service or discount"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="table-responsive">
              <table ref={tableRef} id="example" className="table table-striped">
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
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={tableHeaders.length} className="text-center py-5">
                        <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <div className="mt-2">Loading Offers...</div>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={tableHeaders.length} className="text-center py-5">
                        <div className="d-flex flex-column align-items-center text-muted">
                          <i className="fa fa-box-open mb-3" style={{ fontSize: "2rem", color: "#adb5bd" }}></i>
                          <h6 className="mb-1" style={{ fontWeight: 600 }}>No Offers Found</h6>
                          <p style={{ fontSize: "0.9rem", color: "#6c757d", margin: 0 }}>
                            Try adding a new offer or refreshing the page.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    memoizedRowList
                  )}
                </tbody>
              </table>
            </div>

            {/* 🧮 Total Records & Pagination */}
            <div className="d-flex justify-content-between align-items-center mt-3">
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
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  ))}

                  <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      aria-label="Next"
                    >
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
  );
};


export default OfferTable;
