import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DealerForm from '../../components/Dealers/updateDealer';
import Swal from 'sweetalert2';
import axios from 'axios';
import { getApiErrorMessage } from "../../utils/apiError";

const EditVerifyDeaaaler = () => {

    const { id } = useParams();
    const navigate = useNavigate();
    const [dealerData, setDealerData] = useState(null);

    useEffect(() => {
        const fetchDealer = async () => {
            try {
                const token = localStorage.getItem("adminToken");
                // /dealer/view/:id is the admin-gated (requireAdmin) route.
                // /dealer/dealer/:id is dealer-only (verifyDealerToken + requireOwnDealer)
                // and returns 403 for admin tokens.
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/dealer/view/${id}`, {
                    headers: { token },
                });
                console.log("Res data", res.data)
                if (res.data) {
                    setDealerData(res.data);
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
                    <DealerForm dealerData={dealerData} dealerId={dealerData._id} isEdit={true} />
                ) : (
                    <p>Loading dealer data...</p>
                )}
            </div>
        </div>
    );
};

export default EditVerifyDeaaaler
