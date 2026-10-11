import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
} from "@mui/material";

const STATE_CITY_DATA = {
  "Andhra Pradesh": [
    "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry",
    "Kadapa", "Kakinada", "Anantapur", "Tirupati", "Chittoor", "Eluru", "Ongole",
    "Nandyal", "Machilipatnam", "Adoni", "Tenali", "Proddatur", "Hindupur",
    "Bhimavaram", "Madanapalle", "Guntakal", "Dharmavaram", "Srikakulam", "Vizianagaram"
  ],
  "Arunachal Pradesh": [
    "Itanagar", "Naharlagun", "Tawang", "Ziro", "Pasighat", "Bomdila", "Aalo",
    "Changlang", "Tezu", "Roing", "Khonsa", "Seppa", "Yingkiong", "Daporijo", "Namsai"
  ],
  "Assam": [
    "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur",
    "Karimganj", "Sivasagar", "Goalpara", "Barpeta", "North Lakhimpur", "Dhubri",
    "Diphu", "Golaghat", "Bongaigaon", "Hailakandi", "Nalbari", "Morigaon", "Kokrajhar"
  ],
  "Bihar": [
    "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Arrah",
    "Begusarai", "Katihar", "Munger", "Chhapra", "Bettiah", "Motihari", "Saharsa",
    "Sasaram", "Hajipur", "Dehri", "Siwan", "Bihar Sharif", "Buxar", "Kishanganj",
    "Jehanabad", "Aurangabad", "Samastipur"
  ],
  "Chhattisgarh": [
    "Raipur", "Bilaspur", "Durg", "Bhilai", "Korba", "Rajnandgaon", "Jagdalpur",
    "Ambikapur", "Raigarh", "Dhamtari", "Mahasamund", "Kanker", "Kawardha",
    "Bemetara", "Janjgir"
  ],
  "Goa": [
    "Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim",
    "Curchorem", "Sanguem", "Canacona", "Valpoi", "Pernem"
  ],
  "Gujarat": [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh",
    "Gandhinagar", "Anand", "Nadiad", "Morbi", "Mehsana", "Bharuch", "Vapi",
    "Navsari", "Surendranagar", "Porbandar", "Godhra", "Patan", "Palanpur",
    "Veraval", "Valsad", "Amreli", "Botad", "Dahod"
  ],
  "Haryana": [
    "Gurgaon", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak",
    "Yamunanagar", "Panchkula", "Sonipat", "Sirsa", "Bhiwani", "Bahadurgarh",
    "Jind", "Kaithal", "Rewari", "Kurukshetra", "Palwal", "Fatehabad",
    "Narnaul", "Jhajjar", "Mahendragarh"
  ],
  "Himachal Pradesh": [
    "Shimla", "Manali", "Dharamshala", "Solan", "Mandi", "Kullu", "Una",
    "Bilaspur", "Hamirpur", "Chamba", "Kangra", "Nahan", "Palampur", "Kasauli", "Baddi"
  ],
  "Jharkhand": [
    "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh",
    "Giridih", "Ramgarh", "Medininagar", "Chaibasa", "Phusro", "Dumka",
    "Godda", "Chatra", "Gumla", "Lohardaga", "Pakur", "Sahibganj"
  ],
  "Karnataka": [
    "Bengaluru", "Mysuru", "Mangaluru", "Hubli", "Dharwad", "Belagavi",
    "Kalaburagi", "Davanagere", "Ballari", "Vijayapura", "Shivamogga",
    "Tumakuru", "Raichur", "Bidar", "Hospet", "Hassan", "Gadag", "Udupi",
    "Chitradurga", "Kolar", "Mandya", "Bagalkot", "Chikkamagaluru", "Koppal", "Yadgir"
  ],
  "Kerala": [
    "Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur",
    "Alappuzha", "Palakkad", "Kannur", "Kottayam", "Malappuram",
    "Pathanamthitta", "Idukki", "Wayanad", "Kasaragod", "Ernakulam",
    "Munnar", "Varkala", "Guruvayur"
  ],
  "Madhya Pradesh": [
    "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas",
    "Satna", "Ratlam", "Rewa", "Katni", "Singrauli", "Burhanpur", "Khandwa",
    "Morena", "Chhindwara", "Guna", "Vidisha", "Chhatarpur", "Damoh",
    "Shivpuri", "Neemuch", "Mandsaur", "Balaghat", "Panna"
  ],
  "Maharashtra": [
    "Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Solapur",
    "Amravati", "Kolhapur", "Sangli", "Akola", "Latur", "Dhule", "Ahmednagar",
    "Chandrapur", "Parbhani", "Jalgaon", "Bhiwandi", "Nanded", "Satara",
    "Wardha", "Yavatmal", "Beed", "Osmanabad", "Ratnagiri", "Raigad",
    "Palghar", "Navi Mumbai"
  ],
  "Manipur": [
    "Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Kakching", "Ukhrul",
    "Senapati", "Tamenglong", "Chandel", "Jiribam", "Moreh"
  ],
  "Meghalaya": [
    "Shillong", "Tura", "Jowai", "Nongstoin", "Baghmara", "Williamnagar",
    "Nongpoh", "Resubelpara", "Mairang", "Khliehriat"
  ],
  "Mizoram": [
    "Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib", "Saiha",
    "Lawngtlai", "Mamit", "Khawzawl", "Saitual"
  ],
  "Nagaland": [
    "Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto",
    "Phek", "Mon", "Kiphire", "Longleng", "Peren"
  ],
  "Odisha": [
    "Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri",
    "Balasore", "Baripada", "Bhadrak", "Jharsuguda", "Jeypore", "Angul",
    "Dhenkanal", "Koraput", "Rayagada", "Kendrapara", "Bargarh", "Paradip", "Talcher"
  ],
  "Punjab": [
    "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali",
    "Pathankot", "Hoshiarpur", "Batala", "Moga", "Abohar", "Malerkotla",
    "Khanna", "Phagwara", "Muktsar", "Barnala", "Firozpur", "Kapurthala",
    "Sangrur", "Fazilka", "Faridkot", "Rupnagar"
  ],
  "Rajasthan": [
    "Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Bhilwara",
    "Alwar", "Bharatpur", "Sikar", "Pali", "Sri Ganganagar", "Kishangarh",
    "Baran", "Dhaulpur", "Tonk", "Beawar", "Hanumangarh", "Churu",
    "Jhunjhunu", "Nagaur", "Barmer", "Jaisalmer", "Banswara", "Chittorgarh",
    "Sawai Madhopur", "Dausa"
  ],
  "Sikkim": [
    "Gangtok", "Namchi", "Gyalshing", "Mangan", "Rangpo", "Singtam",
    "Jorethang", "Pakyong"
  ],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem",
    "Tirunelveli", "Erode", "Vellore", "Thoothukudi", "Dindigul",
    "Thanjavur", "Ranipet", "Nagercoil", "Kanchipuram", "Karur", "Cuddalore",
    "Kumbakonam", "Tiruvannamalai", "Pollachi", "Rajapalayam", "Sivakasi",
    "Hosur", "Nagapattinam", "Namakkal", "Ramanathapuram", "Virudhunagar"
  ],
  "Telangana": [
    "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam",
    "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet",
    "Miryalaguda", "Siddipet", "Jagtial", "Sangareddy", "Medak",
    "Mancherial", "Kothagudem", "Bhongir", "Wanaparthy", "Kamareddy"
  ],
  "Tripura": [
    "Agartala", "Udaipur", "Dharmanagar", "Kailasahar", "Belonia", "Khowai",
    "Ambassa", "Sabroom", "Sonamura", "Teliamura"
  ],
  "Uttar Pradesh": [
    "Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut", "Prayagraj",
    "Ghaziabad", "Noida", "Bareilly", "Aligarh", "Moradabad", "Saharanpur",
    "Gorakhpur", "Ayodhya", "Jhansi", "Muzaffarnagar", "Mathura", "Firozabad",
    "Rampur", "Shahjahanpur", "Farrukhabad", "Mau", "Hapur", "Etawah",
    "Mirzapur", "Bulandshahr", "Sitapur", "Hardoi", "Fatehpur", "Raebareli",
    "Orai", "Sultanpur", "Azamgarh", "Bahraich", "Ballia", "Jaunpur",
    "Basti", "Ghazipur", "Deoria"
  ],
  "Uttarakhand": [
    "Dehradun", "Haridwar", "Nainital", "Roorkee", "Haldwani", "Rudrapur",
    "Kashipur", "Rishikesh", "Almora", "Pithoragarh", "Pauri", "Tehri",
    "Ramnagar", "Mussoorie", "Kotdwar", "Vikasnagar"
  ],
  "West Bengal": [
    "Kolkata", "Asansol", "Siliguri", "Durgapur", "Bardhaman", "Malda",
    "Baharampur", "Habra", "Kharagpur", "Shantipur", "Dankuni", "Dhulian",
    "Ranaghat", "Haldia", "Raiganj", "Krishnanagar", "Medinipur",
    "Jalpaiguri", "Balurghat", "Basirhat", "Bankura", "Purulia",
    "Cooch Behar", "Alipurduar", "Darjeeling"
  ],
  "Andaman and Nicobar Islands": [
    "Port Blair", "Diglipur", "Mayabunder", "Rangat", "Car Nicobar",
    "Hut Bay", "Neil Island", "Havelock Island"
  ],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Delhi": [
    "New Delhi", "Dwarka", "Rohini", "Karol Bagh", "Connaught Place",
    "Saket", "Vasant Kunj", "Pitampura", "Janakpuri", "Lajpat Nagar",
    "Shahdara", "Najafgarh", "Narela", "Mayur Vihar", "Preet Vihar", "Rajouri Garden"
  ],
  "Jammu and Kashmir": [
    "Srinagar", "Jammu", "Anantnag", "Baramulla", "Sopore", "Kathua",
    "Udhampur", "Rajouri", "Kupwara", "Pulwama", "Budgam", "Poonch",
    "Ganderbal", "Bandipora", "Kulgam", "Shopian", "Doda", "Kishtwar",
    "Samba", "Reasi"
  ],
  "Ladakh": ["Leh", "Kargil", "Nubra", "Zanskar", "Diskit"],
  "Lakshadweep": ["Kavaratti", "Agatti", "Amini", "Andrott", "Minicoy", "Kalpeni"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"]
};

const StateCitySelect = ({
  value,
  onChange,
  stateName,
  cityName,
  errors = {},
  disabled = false,
  stateLabel,
  cityLabel,
  gridProps = { md: 6 }
}) => {
  const selectedState = value?.[stateName] || "";
  const selectedCity = value?.[cityName] || "";
  const [cities, setCities] = useState([]);

  // Keep the predefined dataset as the base list, but if the dealer's stored
  // state/city isn't in it, add it so the existing value stays visible and
  // editable instead of rendering blank / disappearing.
  const stateOptions =
    selectedState && !STATE_CITY_DATA[selectedState]
      ? [selectedState, ...Object.keys(STATE_CITY_DATA)]
      : Object.keys(STATE_CITY_DATA);

  useEffect(() => {
    if (selectedState) {
      const baseCities = STATE_CITY_DATA[selectedState] || [];
      setCities(
        selectedCity && !baseCities.includes(selectedCity)
          ? [selectedCity, ...baseCities]
          : baseCities
      );
    } else {
      setCities(selectedCity ? [selectedCity] : []);
    }
  }, [selectedState, selectedCity]);

  const handleStateChange = (e) => {
    onChange({
      target: {
        name: stateName,
        value: e.target.value
      }
    });
    
    onChange({
      target: {
        name: cityName,
        value: ""
      }
    });
  };

  const handleCityChange = (e) => {
    onChange({
      target: {
        name: cityName,
        value: e.target.value
      }
    });
  };

  // Determine labels if not provided
  const finalStateLabel = stateLabel || (stateName.includes('permanent') ? 'Permanent State' : stateName.includes('present') ? 'Present State' : 'State');
  const finalCityLabel = cityLabel || (cityName.includes('permanent') ? 'Permanent City' : cityName.includes('present') ? 'Present City' : 'City');

  return (
    <Grid container spacing={2} sx={{ width: "100%", m: 0 }}>
      <Grid item xs={12} {...gridProps}>
        <FormControl fullWidth error={!!errors[stateName]} disabled={disabled} variant="outlined">
          <InputLabel id={`${stateName}-label`}>{finalStateLabel}</InputLabel>
          <Select
            labelId={`${stateName}-label`}
            id={`${stateName}-select`}
            value={selectedState}
            label={finalStateLabel}
            onChange={handleStateChange}
            required
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">
              <em>Select State</em>
            </MenuItem>
            {stateOptions.map((state) => (
              <MenuItem key={state} value={state}>
                {state}
              </MenuItem>
            ))}
          </Select>
          {errors[stateName] && <FormHelperText>{errors[stateName]}</FormHelperText>}
        </FormControl>
      </Grid>

      <Grid item xs={12} {...gridProps}>
        <FormControl fullWidth error={!!errors[cityName]} disabled={!selectedState || disabled} variant="outlined">
          <InputLabel id={`${cityName}-label`}>{finalCityLabel}</InputLabel>
          <Select
            labelId={`${cityName}-label`}
            id={`${cityName}-select`}
            value={selectedCity}
            label={finalCityLabel}
            onChange={handleCityChange}
            required
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="" disabled>
              <em>{selectedState ? "Select City" : "Select a State First"}</em>
            </MenuItem>
            {cities.map((city) => (
              <MenuItem key={city} value={city}>
                {city}
              </MenuItem>
            ))}
          </Select>
          {errors[cityName] && <FormHelperText>{errors[cityName]}</FormHelperText>}
        </FormControl>
      </Grid>
    </Grid>
  );
};

export default StateCitySelect;
