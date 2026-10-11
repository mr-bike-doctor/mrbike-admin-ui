import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Avatar,
  Alert,
  CircularProgress,
  Snackbar,
  Grid
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import SaveIcon from '@mui/icons-material/Save'
import { createBaseAdditionalService, getBaseAdditionalServiceById, updateBaseAdditionalService } from '../../api/additionalServiceApi'
import PageHeader from '../Global/PageHeader'
import { BsStars } from "react-icons/bs";
import axios from "axios";
import { InputAdornment, IconButton, Tooltip } from '@mui/material';

const AI_API_URL = process.env.REACT_APP_AI_API_URL || "/ai/generate";

// Helper to form image URLs correctly
const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http")) return imagePath;
  const baseUrl = process.env.REACT_APP_IMAGE_BASE_URL || "https://api.mrbikedoctor.cloud/";
  return `${baseUrl}${imagePath}`;
};

const BaseAdditionalServiceForm = ({ isEdit = false }) => {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [existingImage, setExistingImage] = useState(null)
  
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '', severity: 'success' })

  useEffect(() => {
    if (isEdit && id) {
      const fetchService = async () => {
        try {
          setIsLoading(true)
          const response = await getBaseAdditionalServiceById(id)
          if (response && response.data) {
            const service = response.data
            setFormData({ 
              name: service.name || '',
              description: service.description || '',
            })
            setExistingImage(service.image || null)
          }
        } catch (error) {
          console.error('Error fetching service:', error)
          setAlertInfo({ show: true, message: 'Failed to load service details', severity: 'error' })
        } finally {
          setIsLoading(false)
        }
      }
      fetchService()
    }
  }, [isEdit, id])

  const validate = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = 'Service name is required'
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters'
    }

    if (!isEdit && !image) {
      errors.image = 'Service image is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
      if (formErrors.image) {
        setFormErrors(prev => ({ ...prev, image: '' }))
      }
    }
  }

  const handleGenerateDescription = async () => {
    if (!formData.name.trim()) return;

    setIsGenerating(true);
    try {
      const { data } = await axios.post(AI_API_URL, {
        prompt: `Write a clear, professional description for a bike service called "${formData.name}". Please provide the description ONLY as a short list of bullet points using standard dashes (-). Do not use any markdown formatting like asterisks (**) for bolding. Do not include any introductory text, conversational filler, or concluding remarks.`,
      });

      if (data?.result) {
        setFormData((prev) => ({ ...prev, description: data.result }));
      }
    } catch (error) {
      console.error("Failed to generate description:", error);
      setAlertInfo({ show: true, message: "Failed to generate AI description", severity: "error" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormErrors({})

    const isValid = validate()
    if (!isValid) return

    setIsSubmitting(true)

    try {
      const form = new FormData()
      form.append('name', formData.name)
      form.append('description', formData.description)
      if (image) form.append('image', image)

      let response
      if (isEdit) {
        response = await updateBaseAdditionalService(id, form)
      } else {
        response = await createBaseAdditionalService(form)
      }

      if (response?.status === true || response?.status === 200) {
        setAlertInfo({ show: true, message: `Base Service ${isEdit ? 'updated' : 'created'} successfully!`, severity: 'success' })
        setTimeout(() => navigate('/base-additional-services'), 1500)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      const errMessage = error.response?.data?.message || 'Something went wrong!'
      setAlertInfo({ show: true, message: errMessage, severity: 'error' })
      
      const err = error.response?.data
      if (err?.field) {
        setFormErrors((prev) => ({ ...prev, [err.field]: err.message }))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <Box sx={{ py: 1 }}>
          <PageHeader
            title={`${isEdit ? 'Edit' : 'Create'} Additional Service`}
            breadcrumbs={[
              { label: "Dashboard", path: "/" },
              { label: "Additional Services", path: "/base-additional-services" },
              { label: isEdit ? "Edit" : "Create", path: "#" },
            ]}
          />

          <Card elevation={3} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={7}>
                    <Stack spacing={3}>
                      <TextField
                        fullWidth
                        label="Service Name *"
                        name="name"
                        placeholder="e.g. Wheel Alignment"
                        value={formData.name}
                        onChange={handleChange}
                        error={!!formErrors.name}
                        helperText={formErrors.name}
                      />

                      <TextField
                        fullWidth
                        label="Service Description"
                        name="description"
                        placeholder="Detailed description of the additional service..."
                        value={formData.description}
                        onChange={handleChange}
                        multiline
                        rows={4}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end" sx={{ alignSelf: "flex-end", mb: 1, mr: -1 }}>
                              <Tooltip title="Generate description with AI">
                                <IconButton
                                  color="primary"
                                  onClick={handleGenerateDescription}
                                  disabled={!formData.name.trim() || isGenerating}
                                >
                                  {isGenerating ? <CircularProgress size={24} /> : <BsStars />}
                                </IconButton>
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                          Service Image {!isEdit && '*'}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Button
                            component="label"
                            variant="outlined"
                            startIcon={<CloudUploadIcon />}
                            sx={{ height: '56px' }}
                          >
                            Upload File
                            <input
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={handleFileChange}
                            />
                          </Button>
                          <Typography variant="body2" color="text.secondary">
                            {image ? image.name : 'No file chosen'}
                          </Typography>
                        </Stack>
                        {formErrors.image && (
                          <Typography variant="caption" color="error" sx={{ ml: 1, mt: 0.5, display: 'block' }}>
                            {formErrors.image}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <Box sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 2,
                      border: '1px dashed',
                      borderColor: 'divider',
                      minHeight: '200px'
                    }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        Image Preview
                      </Typography>
                      
                      {(imagePreview || existingImage) ? (
                        <Avatar
                          src={imagePreview || getImageUrl(existingImage)}
                          variant="rounded"
                          sx={{ width: 180, height: 180, boxShadow: 2 }}
                        />
                      ) : (
                        <Box sx={{ 
                          width: 180, 
                          height: 180, 
                          bgcolor: 'grey.200', 
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography variant="body2" color="text.secondary">No Image</Typography>
                        </Box>
                      )}

                      {isEdit && existingImage && !image && (
                        <Typography variant="caption" color="info.main" sx={{ mt: 2 }}>
                          Current image is displayed. Upload to replace.
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => navigate('/base-additional-services')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting}
                    size="large"
                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  >
                    {isSubmitting ? 'Submitting...' : isEdit ? 'Update Service' : 'Create Service'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Box>
      </div>

      <Snackbar
        open={alertInfo.show}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClose={() => setAlertInfo({ ...alertInfo, show: false })}
      >
        <Alert severity={alertInfo.severity} variant="filled" sx={{ width: '100%' }}>
          {alertInfo.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default BaseAdditionalServiceForm
