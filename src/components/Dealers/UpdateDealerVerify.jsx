import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import axios from 'axios';
import { updateDealer } from '../../api';
import { getApiErrorMessage } from "../../utils/apiError";

// const UpdateDealerVerify = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [dealerData, setDealerData] = useState(null);

//     useEffect(() => {
//         const fetchDealer = async () => {
//             try {
//                 // const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/dealerAuth/pending-registrations`, {
//                 const res = await axios.get(`https://api.mrbikedoctor.cloud/bikedoctor/dealerAuth/pending-registrations/6877f0acaf7a544745bf5295`);
//                 console.log("Res data", res.data)
//                 if (res.data.success) {
//                     setDealerData(res.data.vendor);
//                 } else {
//                     Swal.fire("Error", "Failed to fetch dealer data", "error");
//                 }
//             } catch (err) {
//                 console.error(err);
//                 Swal.fire("Error", "Something went wrong while fetching dealer data", "error");
//             }
//         };

//         fetchDealer();
//     }, [id]);

//     console.log("dealerData", dealerData)

//     return (
//         <div className="page-wrapper">
//             <div className="content container-fluid">
//                 <div className="page-header">
//                     <div className="content-page-header">
//                         <h5>Edit Dealer</h5>
//                         <button className="btn" style={{ backgroundColor: "black", color: "white" }} onClick={() => navigate(-1)}>
//                             <i className="fas fa-arrow-left me-2"></i> Back
//                         </button>
//                     </div>
//                 </div>
//                 {dealerData ? (
//                     <DealerForm dealerData={dealerData} dealerId={dealerData._id} isEdit={true} />
//                 ) : (
//                     <p>Loading dealer data...</p>
//                 )}
//             </div>
//         </div>
//     );
// };

const UpdateDealerVerify = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dealerData, setDealerData] = useState(null);
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        const fetchDealer = async () => {
            try {
                const res = await axios.get(`https://api.mrbikedoctor.cloud/bikedoctor/dealerAuth/pending-registrations/${id}`);
                console.log("Res data", res.data);
                if (res.data.success) {
                    setDealerData(res.data.vendor);
                    setIsVerified(res.data.vendor.registrationStatus === "Approved");
                } else {
                    Swal.fire("Error", "Failed to fetch dealer data", "error");
                }
            } catch (err) {
                console.error(err);
                Swal.fire("Error", getApiErrorMessage(err, "Failed to fetch dealer data."), "error");
            }
        };

        fetchDealer();
    }, [id]);

    // const showApprovalDialog = () => {
    //     Swal.fire({
    //         title: 'Dealer Approval',
    //         text: 'This dealer is not yet verified. Do you want to approve or reject?',
    //         showDenyButton: true,
    //         showCancelButton: true,
    //         confirmButtonText: 'Approve',
    //         denyButtonText: 'Reject',
    //         cancelButtonText: 'Cancel'
    //     }).then((result) => {
    //         if (result.isConfirmed) {
    //             handleApproval('approve');
    //         } else if (result.isDenied) {
    //             handleApproval('reject');
    //         }
    //     });
    // };

    const showApprovalDialog = () => {
        Swal.fire({
            title: 'Dealer Approval',
            text: 'This dealer is not yet verified. Do you want to approve or reject?',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Approve',
            denyButtonText: 'Reject',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#3085d6',
            denyButtonColor: '#d33',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    console.log("formData", id)
                    const response = await axios.put(
                        // `https://api.mrbikedoctor.cloud/bikedoctor/dealerAuth/approve/${id}`,
                        `https://api.mrbikedoctor.cloud/bikedoctor/dealerAuth/approve/${id}`,
                        {},
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'token': localStorage.getItem('adminToken')
                            }
                        }
                    );

                    if (response.data.success) {
                        Swal.fire('Approved!', 'Dealer has been approved.', 'success');
                        setIsVerified(true);
                        navigate('/dealers');
                    } else {
                        throw new Error(response.data.message || 'Approval failed');
                    }
                } catch (error) {
                    Swal.fire('Error', error.message || 'Failed to approve dealer', 'error');
                }
            } else if (result.isDenied) {
                try {
                    const response = await axios.put(
                        `https://api.mrbikedoctor.cloud/bikedoctor/dealerAuth/reject/${id}`,
                        {},
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'token': localStorage.getItem('adminToken')
                            }
                        }
                    );

                    if (response.data.success) {
                        Swal.fire('Rejected!', 'Dealer has been rejected.', 'success');
                        navigate('/dealers');
                    } else {
                        throw new Error(response.data.message || 'Rejection failed');
                    }
                } catch (error) {
                    Swal.fire('Error', error.message || 'Failed to reject dealer', 'error');
                }
            }
        });
    };

    console.log("dealerData", dealerData);

    return (
        <div className="page-wrapper">
            <div className="content container-fluid">
                <div className="page-header">
                    <div className="content-page-header">
                        <h5>Edit Dealer</h5>
                        <button className="btn" style={{ backgroundColor: "black", color: "white" }} onClick={() => navigate(-1)}>
                            <i className="fas fa-arrow-left me-2"></i> Back
                        </button>
                    </div>
                </div>
                {dealerData ? (
                    <DealerForm
                        dealerData={dealerData}
                        dealerId={dealerData._id}
                        isEdit={true}
                        isVerified={isVerified}
                        showApprovalDialog={showApprovalDialog}
                    />
                ) : (
                    <p>Loading dealer data...</p>
                )}
            </div>
        </div>
    );
};

export default UpdateDealerVerify;

const DealerForm = ({ dealerData, dealerId, isEdit, isVerified, showApprovalDialog }) => {
    const navigate = useNavigate();
    const [, setShopImages] = useState([]);
    const [existingShopImages, setExistingShopImages] = useState(
        isEdit && dealerData?.shopImages?.length > 0
            ? dealerData.shopImages.map(img => `https://api.mrbikedoctor.cloud/${img}`)
            : []
    );
    const [existingImages, setExistingImages] = useState({
        panCardFront: isEdit && dealerData?.documents?.panCardFront
            ? `https://api.mrbikedoctor.cloud/${dealerData.documents.panCardFront}`
            : null,
        aadharFront: isEdit && dealerData?.documents?.aadharFront
            ? `https://api.mrbikedoctor.cloud/${dealerData.documents.aadharFront}`
            : null,
        aadharBack: isEdit && dealerData?.documents?.aadharBack
            ? `https://api.mrbikedoctor.cloud/${dealerData.documents.aadharBack}`
            : null,
    });
    const handleMultipleImages = (e) => {
        const files = Array.from(e.target.files);

        // Validate number of images (max 5 total)
        if (files.length + previewUrls.length + existingShopImages.length > 5) {
            setErrors(prev => ({
                ...prev,
                shopImages: "You can upload a maximum of 5 images"
            }));
            return;
        }

        // Validate file types and sizes
        const validFiles = files.filter(file => {
            if (!file.type.match('image.*')) {
                return false;
            }
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setErrors(prev => ({
                    ...prev,
                    shopImages: "Image size should be less than 2MB"
                }));
                return false;
            }
            return true;
        });

        // Create preview URLs
        const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
        setShopImages(prev => [...prev, ...validFiles]);

        // Clear any errors
        setErrors(prev => ({ ...prev, shopImages: undefined }));
    };

    const handleRemoveImage = (index, isExisting = false) => {
        if (isExisting) {
            setExistingShopImages(prev => prev.filter((_, i) => i !== index));
        } else {
            // Revoke the object URL to avoid memory leaks
            URL.revokeObjectURL(previewUrls[index]);
            setPreviewUrls(prev => prev.filter((_, i) => i !== index));
            setShopImages(prev => prev.filter((_, i) => i !== index));
        }
    };
    const handleFileUpload = (e, setter, fieldName) => {
        const file = e.target.files[0];
        if (file) {
            setter(file);
            setExistingImages(prev => ({ ...prev, [fieldName]: null }));
            setErrors(prev => ({ ...prev, [fieldName]: undefined }));
        }
    };
    console.log("Dealer", dealerData)
    const initializeFormData = () => {
        if (isEdit && dealerData) {
            return {
                shopName: dealerData.shopName,
                email: dealerData.email,
                phone: dealerData.phone,
                alternatePhone: dealerData.alternatePhone || '',
                shopPincode: dealerData.shopPincode,
                shopNumber: dealerData.shopNumber || '',
                locality: dealerData.locality || '',
                ownerName: dealerData.ownerName,
                fullAddress: dealerData.fullAddress,
                city: dealerData.city,
                state: dealerData.state,
                comission: dealerData.commission,
                tax: dealerData.tax,
                latitude: dealerData.latitude,
                longitude: dealerData.longitude,
                accountHolderName: dealerData.bankDetails?.accountHolderName || '',
                ifscCode: dealerData.bankDetails?.ifscCode || '',
                bankName: dealerData.bankDetails?.bankName || '',
                accountNumber: dealerData.bankDetails?.accountNumber || '',
                aadharCardNo: dealerData.aadharCardNo || '',
                panCardNo: dealerData.panCardNo || '',
                gstNumber: dealerData.gstNumber || ''
            };
        }
        return {
            shopName: '',
            email: '',
            phone: '',
            alternatePhone: '',
            shopPincode: '',
            shopNumber: '',
            locality: '',
            ownerName: '',
            fullAddress: '',
            city: '',
            state: '',
            comission: '',
            tax: '',
            latitude: '',
            longitude: '',
            accountHolderName: '',
            ifscCode: '',
            bankName: '',
            accountNumber: '',
            aadharCardNo: '',
            panCardNo: '',
            gstNumber: ''
        };
    };

    const [formData, setFormData] = useState(initializeFormData());
    const [errors, setErrors] = useState({});
    const [previewUrls, setPreviewUrls] = useState([]);
    const [panCardFront, setPanCardFront] = useState(null);
    const [aadharFront, setAadharFront] = useState(null);
    const [aadharBack, setAadharBack] = useState(null);
    const [, setSameAsPermanent] = useState(
        isEdit && dealerData &&
        dealerData.presentAddress?.address === dealerData.permanentAddress?.address &&
        dealerData.presentAddress?.state === dealerData.permanentAddress?.state &&
        dealerData.presentAddress?.city === dealerData.permanentAddress?.city
    );

    // Handle changes in form inputs
    const handleChange = (e) => {
        const { name, value, checked } = e.target;

        if (name === "sameAsPermanent") {
            setSameAsPermanent(checked);
            if (checked) {
                setFormData((prev) => ({
                    ...prev,
                    presentAddress: prev.permanentAddress,
                    presentState: prev.permanentState,
                    presentCity: prev.permanentCity,
                }));
            }
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Form validation
    const validate = () => {
        const newErrors = {};
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isVerified) {
            showApprovalDialog();
            return;
        }

        if (!validate()) {
            return;
        }

        console.log("Form Data", formData);

        const form = new FormData();

        if (isEdit && dealerId) {
            form.append('id', dealerId);
        }

        console.log("Form", form)

        const allowedTextFields = [
            "shopName",
            "email",
            "phone",
            "alternatePhone",
            "shopPincode",
            "shopNumber",
            "locality",
            "ownerName",
            "fullAddress",
            "city",
            "state",
            "latitude",
            "longitude",
            "comission",
            "tax",
            "accountHolderName",
            "ifscCode",
            "bankName",
            "accountNumber",
            "aadharCardNo",
            "panCardNo",
            "gstNumber"
        ];

        allowedTextFields.forEach((key) => {
            if (formData[key] !== undefined && formData[key] !== null) {
                form.append(key, formData[key]);
            }
        });

        if (panCardFront) form.append("panCardFront", panCardFront);
        if (aadharFront) form.append("aadharFront", aadharFront);
        if (aadharBack) form.append("aadharBack", aadharBack);

        try {
            let response;
            if (isEdit) {
                response = await updateDealer(form);
            }

            console.log("Response", response);
            if (response.success && response.message === "Dealer updated successfully") {
                Swal.fire({
                    title: "Success!",
                    text: response.message || (isEdit ? "Dealer updated successfully" : "Dealer added successfully"),
                    icon: "success"
                });
                setFormData(initializeFormData());
                setPreviewUrls([]);
                setPanCardFront(null);
                setAadharFront(null);
                setAadharBack(null);

                navigate("/dealers");
            }
        } catch (error) {
            const errorData = error.response?.data;
            Swal.fire({
                title: "Error!",
                text: errorData?.message || (isEdit ? "Failed to update dealer" : "Failed to add dealer"),
                icon: "error"
            });

            if (errorData?.field) {
                setErrors(prev => ({
                    ...prev,
                    [errorData.field]: errorData.message
                }));
            }
            console.error("Submission error:", error);
        }
    };

    return (
        <div className="row">
            <div className="col-sm-12">
                <div className="card-table card p-5">
                    <div className="card-body">
                        <form className="form-horizontal" onSubmit={handleSubmit}>
                            <input name="_token" type="hidden" defaultValue="oKup3nu5kd6tUBCqoFTVEMtnOOg1p3zubico9KkM" />
                            {/* Shop Details */}
                            <div className="mb-3 w-100">
                                <div className="d-flex gap-3">
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Owner Name<em style={{ color: "red" }}>*</em></label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.ownerName ? 'is-invalid' : ''}`}
                                            name="ownerName"
                                            value={formData.ownerName}
                                            onChange={handleChange}
                                            placeholder="Enter shop owner name"
                                        />
                                        {errors.ownerName && <div className="invalid-feedback">{errors.ownerName}</div>}
                                    </div>
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Shop Name<em style={{ color: "red" }}>*</em></label>
                                        <input
                                            className={`form-control ${errors.shopName ? 'is-invalid' : ''}`}
                                            type="text"
                                            name="shopName"
                                            value={formData.shopName}
                                            onChange={handleChange}
                                            placeholder="Enter shop name"
                                        />
                                        {errors.shopName && <div className="invalid-feedback">{errors.shopName}</div>}
                                    </div>
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Shop Email<em style={{ color: "red" }}>*</em></label>
                                        <input
                                            type="email"
                                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter shop email"
                                        />
                                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-3 w-100">
                                <div className="d-flex gap-3">
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Shop Contact<em style={{ color: "red" }}>*</em></label>
                                        <input
                                            type="tel"
                                            className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="Enter shop contact details"
                                            maxLength="10"
                                        />
                                        {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                                    </div>
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Alternative Number</label>
                                        <input
                                            type="tel"
                                            className="form-control"
                                            name="alternatePhone"
                                            value={formData.alternatePhone}
                                            onChange={handleChange}
                                            placeholder="Enter alternative number"
                                            maxLength="10"
                                        />
                                    </div>
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Shop Pincode<em style={{ color: "red" }}>*</em></label>
                                        <input
                                            className={`form-control ${errors.shopPincode ? 'is-invalid' : ''}`}
                                            type="text"
                                            name="shopPincode"
                                            value={formData.shopPincode}
                                            onChange={handleChange}
                                            placeholder="Enter shop pincode"
                                            maxLength="6"
                                        />
                                        {errors.shopPincode && <div className="invalid-feedback">{errors.shopPincode}</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-3 w-100">
                                <div className="d-flex gap-3">
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Shop No. / Building<em style={{ color: "red" }}>*</em></label>
                                        <input
                                            className="form-control"
                                            type="text"
                                            name="shopNumber"
                                            value={formData.shopNumber}
                                            onChange={handleChange}
                                            placeholder="e.g. Shop 5B, Ground Floor"
                                        />
                                    </div>
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Locality / Area<em style={{ color: "red" }}>*</em></label>
                                        <input
                                            className="form-control"
                                            type="text"
                                            name="locality"
                                            value={formData.locality}
                                            onChange={handleChange}
                                            placeholder="e.g. Atmakur, Kurnool"
                                        />
                                    </div>
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Shop State<em style={{ color: "red" }}>*</em></label>
                                        <input
                                            className="form-control"
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            placeholder="State"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-3 w-100">
                                <div className="d-flex gap-3">
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Shop City<em style={{ color: "red" }}>*</em></label>
                                        <input
                                            className="form-control"
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            placeholder="City"
                                        />
                                    </div>
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Commission (%)<em style={{ color: "red" }}>*</em></label>
                                        <input
                                            className={`form-control ${errors.comission ? 'is-invalid' : ''}`}
                                            type="number"
                                            name="comission"
                                            value={formData.comission ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? null : Number(e.target.value);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    comission: isNaN(value) ? null : value
                                                }));
                                            }}
                                            placeholder="0-100%"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            onKeyDown={(e) => {
                                                if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                                            }}
                                        />
                                        {errors.comission && <div className="invalid-feedback">{errors.comission}</div>}
                                    </div>
                                    <div className="flex-fill input-block">
                                        <label className="form-control-label">Tax (%)</label>
                                        <input
                                            type="number"
                                            className={`form-control ${errors.tax ? 'is-invalid' : ''}`}
                                            name="tax"
                                            value={formData.tax || ''}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                                handleChange({
                                                    target: {
                                                        name: 'tax',
                                                        value: isNaN(value) ? null : value
                                                    }
                                                });
                                            }}
                                            placeholder="Enter tax percentage (0-18)"
                                            step="0.01"
                                            min="0"
                                            max="18"
                                        />
                                        {errors.tax && <div className="invalid-feedback">{errors.tax}</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="input-block mb-3">
                                <div className="input-block mb-3">
                                    <label className="form-control-label">Latitude<em style={{ color: "red" }}>*</em></label>
                                    <input
                                        className={`form-control ${errors.latitude ? 'is-invalid' : ''}`}
                                        type="number"
                                        name="latitude"
                                        value={formData.latitude}
                                        onChange={handleChange}
                                        placeholder="Enter latitude of the shop"
                                        step="any"
                                    />
                                    {errors.latitude && <div className="invalid-feedback">{errors.latitude}</div>}
                                </div>
                                <div className="input-block mb-3">
                                    <label className="form-control-label">Longitude<em style={{ color: "red" }}>*</em></label>
                                    <input
                                        type="number"
                                        className={`form-control ${errors.longitude ? 'is-invalid' : ''}`}
                                        name="longitude"
                                        value={formData.longitude}
                                        onChange={handleChange}
                                        placeholder="Enter longitude of the shop"
                                        step="any"
                                    />
                                    {errors.longitude && <div className="invalid-feedback">{errors.longitude}</div>}
                                </div>
                            </div>

                            <div className="mb-3 w-100">
                                <div className="d-flex gap-3">
                                    <div className="mb-4">
                                        <label className="form-label fw-semibold">Shop Images<em style={{ color: "red" }}>*</em></label>
                                        <div className="d-flex flex-wrap gap-3">
                                            {existingShopImages.map((url, idx) => (
                                                <div key={`existing-${idx}`} className="image-preview-container">
                                                    <img
                                                        src={url}
                                                        alt={`Shop ${idx + 1}`}
                                                        className="image-preview"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger image-remove-btn"
                                                        onClick={() => handleRemoveImage(idx, true)}
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            ))}
                                            {previewUrls.map((url, idx) => (
                                                <div
                                                    key={`new-${idx}`}
                                                    className="position-relative border rounded"
                                                    style={{
                                                        width: "100px",
                                                        height: "100px",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    <img
                                                        src={url}
                                                        alt={`Preview ${idx}`}
                                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn-close position-absolute top-0 end-0 m-1 bg-white"
                                                        style={{ fontSize: "0.6rem" }}
                                                        onClick={() => handleRemoveImage(idx)}
                                                    ></button>
                                                </div>
                                            ))}

                                            {(existingShopImages.length + previewUrls.length) < 5 && (
                                                <label
                                                    htmlFor="shop-image-upload"
                                                    className="d-flex align-items-center justify-content-center border rounded"
                                                    style={{
                                                        width: "100px",
                                                        height: "100px",
                                                        cursor: "pointer",
                                                        backgroundColor: "#f8f9fa",
                                                    }}
                                                >
                                                    <i className="fas fa-plus text-muted"></i>
                                                </label>
                                            )}
                                        </div>
                                        <input
                                            id="shop-image-upload"
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={handleMultipleImages}
                                        />
                                        <div className="form-text mt-2">You can upload up to 5 images</div>
                                        {errors.shopImages && <div className="text-danger small">{errors.shopImages}</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="text-center mt-5 mb-4">
                                <h4>Identity &amp; Documents</h4>
                            </div>

                            <div className="row">
                                <div className="col-md-6 input-block mb-3">
                                    <label className="form-control-label">PAN Card Front<em style={{ color: "red" }}>*</em></label>
                                    {existingImages.panCardFront && (
                                        <div className="mb-2">
                                            <img
                                                src={existingImages.panCardFront}
                                                alt="PAN Card Front"
                                                className="img-thumbnail"
                                                style={{ maxWidth: '100%', maxHeight: '150px' }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger ms-2"
                                                onClick={() => setExistingImages(prev => ({ ...prev, panCardFront: null }))}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        className={`form-control ${errors.panCardFront ? 'is-invalid' : ''}`}
                                        name="panCardFront"
                                        onChange={(e) => handleFileUpload(e, setPanCardFront, 'panCardFront')}
                                        accept="image/*"
                                    />
                                    {errors.panCardFront && <div className="invalid-feedback">{errors.panCardFront}</div>}
                                </div>
                                <div className="col-md-6 input-block mb-3">
                                    <label className="form-control-label">PAN Card No.<em style={{ color: "red" }}>*</em></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.panCardNo ? 'is-invalid' : ''}`}
                                        name="panCardNo"
                                        value={formData.panCardNo || ''}
                                        onChange={handleChange}
                                        placeholder="Enter PAN number (e.g., ABCDE1234F)"
                                        maxLength="10"
                                    />
                                    {errors.panCardNo && <div className="invalid-feedback">{errors.panCardNo}</div>}
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-6 input-block mb-3">
                                    <label className="form-control-label">Aadhar Front<em style={{ color: "red" }}>*</em></label>
                                    {existingImages.aadharFront && (
                                        <div className="mb-2">
                                            <img
                                                src={existingImages.aadharFront}
                                                alt="Aadhar Front"
                                                className="img-thumbnail"
                                                style={{ maxWidth: '100%', maxHeight: '150px' }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger ms-2"
                                                onClick={() => setExistingImages(prev => ({ ...prev, aadharFront: null }))}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        className={`form-control ${errors.aadharFront ? 'is-invalid' : ''}`}
                                        name="aadharFront"
                                        onChange={(e) => handleFileUpload(e, setAadharFront, 'aadharFront')}
                                        accept="image/*"
                                    />
                                    {errors.aadharFront && <div className="invalid-feedback">{errors.aadharFront}</div>}
                                </div>
                                <div className="col-md-6 input-block mb-3">
                                    <label className="form-control-label">Aadhar Back<em style={{ color: "red" }}>*</em></label>
                                    {existingImages.aadharBack && (
                                        <div className="mb-2">
                                            <img
                                                src={existingImages.aadharBack}
                                                alt="Aadhar Back"
                                                className="img-thumbnail"
                                                style={{ maxWidth: '100%', maxHeight: '150px' }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger ms-2"
                                                onClick={() => setExistingImages(prev => ({ ...prev, aadharBack: null }))}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        className={`form-control ${errors.aadharBack ? 'is-invalid' : ''}`}
                                        name="aadharBack"
                                        onChange={(e) => handleFileUpload(e, setAadharBack, 'aadharBack')}
                                        accept="image/*"
                                    />
                                    {errors.aadharBack && <div className="invalid-feedback">{errors.aadharBack}</div>}
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-6 input-block mb-3">
                                    <label className="form-control-label">Aadhar Card No.<em style={{ color: "red" }}>*</em></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.aadharCardNo ? 'is-invalid' : ''}`}
                                        name="aadharCardNo"
                                        value={formData.aadharCardNo || ''}
                                        onChange={handleChange}
                                        placeholder="Enter 12-digit Aadhar number"
                                        maxLength="12"
                                    />
                                    {errors.aadharCardNo && <div className="invalid-feedback">{errors.aadharCardNo}</div>}
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className='row'>
                                <div className="text-center">
                                    <h4>Bank Information</h4>
                                </div>
                                <div className="mb-3 w-100">
                                    <div className="d-flex gap-3">
                                        <div className="flex-fill input-block">
                                            <label className="form-control-label">Account Holder Name<em style={{ color: "red" }}>*</em></label>
                                            <input
                                                className={`form-control ${errors.accountHolderName ? 'is-invalid' : ''}`}
                                                type="text"
                                                name="accountHolderName"
                                                value={formData.accountHolderName}
                                                onChange={handleChange}
                                                placeholder="Enter account holder name"
                                            />
                                            {errors.accountHolderName && <div className="invalid-feedback">{errors.accountHolderName}</div>}
                                        </div>
                                        <div className="flex-fill input-block">
                                            <label className="form-control-label">IFSC Code<em style={{ color: "red" }}>*</em></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.ifscCode ? 'is-invalid' : ''}`}
                                                name="ifscCode"
                                                value={formData.ifscCode}
                                                onChange={handleChange}
                                                placeholder="Enter IFSC code"
                                            />
                                            {errors.ifscCode && <div className="invalid-feedback">{errors.ifscCode}</div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="mb-3 w-100">
                                    <div className="d-flex gap-3">
                                        <div className="flex-fill input-block">
                                            <label className="form-control-label">Bank Name<em style={{ color: "red" }}>*</em></label>
                                            <input
                                                className={`form-control ${errors.bankName ? 'is-invalid' : ''}`}
                                                type="text"
                                                name="bankName"
                                                value={formData.bankName}
                                                onChange={handleChange}
                                                placeholder="Enter bank name"
                                            />
                                            {errors.bankName && <div className="invalid-feedback">{errors.bankName}</div>}
                                        </div>
                                        <div className="flex-fill input-block">
                                            <label className="form-control-label">Account Number<em style={{ color: "red" }}>*</em></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.accountNumber ? 'is-invalid' : ''}`}
                                                name="accountNumber"
                                                value={formData.accountNumber}
                                                onChange={handleChange}
                                                placeholder="Enter account number"
                                            />
                                            {errors.accountNumber && <div className="invalid-feedback">{errors.accountNumber}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            {/* <div className="form-group col-lg-12 d-flex gap-3 mt-4 mb-5">
                                <button className="btn btn-primary" type="submit">
                                    Accept
                                </button>
                                <button className="btn btn-danger" type="reset">
                                    Reject
                                </button>
                            </div> */}
                            <div className="form-group col-lg-12 d-flex gap-3 mt-4 mb-5">
                                {!isVerified ? (
                                    <>
                                        <button
                                            className="btn btn-success"
                                            type="button"
                                            onClick={() => showApprovalDialog(formData)}
                                        >
                                            Approve Dealer
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            type="button"
                                            onClick={() => showApprovalDialog(formData)}
                                        >
                                            Reject Dealer
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button className="btn btn-primary" type="submit">
                                            Update
                                        </button>
                                        <button className="btn btn-secondary" type="reset">
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div >
        </div >
    );
};
