'use client';

import { useLocation, useNavigate } from "react-router-dom";
import { FaTools, FaMotorcycle, FaCalendarAlt, FaUserCog } from "react-icons/fa";
import ImagePreview from "../../components/Global/ImagePreview";
const ViewAdditionalService = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    if (!state?.serviceData) {
        return (
            <div className="alert alert-danger mt-4">
                Service data not found. Please go back to the list.
            </div>
        );
    }

    const { serviceData } = state;

    return (
        <div className="page-wrapper">
            <div className="content container-fluid">
                <div className="page-header">
                    <div className="content-page-header">
                        <button className="btn" style={{ backgroundColor: "black", color: "white" }} onClick={() => navigate(-1)}>
                            <i className="fas fa-arrow-left me-2"></i> Back
                        </button>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-8">
                        <div className="card">
                            <div className="card-header bg-primary text-white">
                                <h4 className="mb-0">
                                    <FaTools className="me-2" />
                                    {serviceData.name}
                                </h4>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="service-image-container mb-4">
                                            {serviceData.image ? (
                                                <ImagePreview image={serviceData.image} />
                                            ) : (
                                                <div className="no-image-placeholder bg-light d-flex align-items-center justify-content-center"
                                                    style={{ height: '300px' }}>
                                                    <span>No Image Available</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <h5 className="text-primary mb-3">
                                            <FaMotorcycle className="me-2" />
                                            Service Details
                                        </h5>
                                        <p className="mb-4">{serviceData.description}</p>

                                        <div className="service-meta mb-4">
                                            <div className="d-flex align-items-center mb-2">
                                                <FaUserCog className="me-2 text-muted" />
                                                <span>
                                                    <strong>Dealer:</strong> {serviceData.dealer_id?.name || "N/A"}
                                                </span>
                                            </div>
                                            <div className="d-flex align-items-center mb-2">
                                                <FaCalendarAlt className="me-2 text-muted" />
                                                <span>
                                                    <strong>Created:</strong> {new Date(serviceData.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <h5 className="text-primary mb-3">
                                        <FaMotorcycle className="me-2" />
                                        Bike Specifications
                                    </h5>
                                    {serviceData.bikes?.length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="table table-bordered">
                                                <thead className="thead-light">
                                                    <tr>
                                                        <th>CC</th>
                                                        <th>Price</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {serviceData.bikes.map((bike, index) => (
                                                        <tr key={index}>
                                                            <td>{bike.cc} CC</td>
                                                            <td>₹{bike.price}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="alert alert-info">No bike specifications available</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-header bg-primary text-white">
                                <h5 className="mb-0">Service Actions</h5>
                            </div>
                            <div className="card-body">
                                <div className="d-grid gap-2">
                                    <button
                                        className="btn btn-outline-primary"
                                        onClick={() => navigate(`/additional-services/edit/${serviceData._id}`, {
                                            state: { serviceData }
                                        })}
                                    >
                                        <i className="far fa-edit me-2"></i> Edit Service
                                    </button>
                                    <button 
                                        className="btn btn-outline-secondary"
                                        onClick={() => window.print()}
                                    >
                                        <i className="fas fa-print me-2"></i> Print Details
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card mt-4">
                            <div className="card-header bg-primary text-white">
                                <h5 className="mb-0">Quick Stats</h5>
                            </div>
                            <div className="card-body">
                                <ul className="list-group list-group-flush">
                                    <li className="list-group-item d-flex justify-content-between align-items-center">
                                        Bike Variants
                                        <span className="badge bg-primary rounded-pill">
                                            {serviceData.bikes?.length || 0}
                                        </span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center">
                                        Created
                                        <small>{new Date(serviceData.createdAt).toLocaleDateString()}</small>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center">
                                        Last Updated
                                        <small>{new Date(serviceData.updatedAt).toLocaleDateString()}</small>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewAdditionalService;
