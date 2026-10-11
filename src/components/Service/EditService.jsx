import { useParams } from "react-router-dom"
import ServiceForm from "./ServiceForm"
import { Box } from "@mui/material"

const EditService = () => {
  const { id, dealerId } = useParams()

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: "#f4f7fa", minHeight: "100vh" }}>
      {/* Page Header Section */}
      <Box>

        {/* Improved Service Summary Card */}
      </Box>

      <Box sx={{ mt: 2 }}>
        <ServiceForm serviceId={id} dealerId={dealerId} />
      </Box>
    </Box>
  )
}

export default EditService
