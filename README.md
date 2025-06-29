# Get Business Details from Places on Maps 🌍🗺️

![GitHub release](https://img.shields.io/github/release/DevStraight/getBusinessDetailsFromPlaces.svg)
[![Download Latest Release](https://img.shields.io/badge/Download%20Latest%20Release-Get%20Business%20Details%20from%20Places-brightgreen)](https://github.com/DevStraight/getBusinessDetailsFromPlaces/releases)

## Overview

This repository provides a straightforward way to extract business details from various locations using the Google Places API. Whether you're looking for addresses, phone numbers, or other essential information, this tool simplifies the process. 

## Features

- **Location-based Searches**: Retrieve business information based on specific locations.
- **JSON Output**: Get results in a clean JSON format for easy integration.
- **Swagger UI**: Explore the API with a user-friendly interface.
- **Custom Payloads**: Send tailored requests to get the data you need.
- **Website Integration**: Easily integrate with your existing applications.

## Getting Started

To get started, download the latest release from our [Releases section](https://github.com/DevStraight/getBusinessDetailsFromPlaces/releases). Once downloaded, execute the file to set up the tool on your system.

### Prerequisites

- **Node.js**: Ensure you have Node.js installed on your machine. You can download it from [nodejs.org](https://nodejs.org/).
- **API Key**: You will need a Google Places API key. Sign up on the [Google Cloud Console](https://console.cloud.google.com/) to obtain one.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/DevStraight/getBusinessDetailsFromPlaces.git
   cd getBusinessDetailsFromPlaces
   ```

2. Install the required dependencies:

   ```bash
   npm install
   ```

3. Set up your API key:

   Create a `.env` file in the root directory and add your API key:

   ```
   GOOGLE_PLACES_API_KEY=your_api_key_here
   ```

4. Start the application:

   ```bash
   npm start
   ```

## Usage

### Making a Request

You can make requests to the API to fetch business details. Here’s a sample request format:

```javascript
const axios = require('axios');

const getBusinessDetails = async (location) => {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${location}&inputtype=textquery&fields=name,formatted_address,geometry&key=${process.env.GOOGLE_PLACES_API_KEY}`);
    return response.data;
};

getBusinessDetails('Pizza Place, New York').then(data => {
    console.log(data);
});
```

### Response Structure

The API will return a JSON object with the following structure:

```json
{
  "candidates": [
    {
      "name": "Pizza Place",
      "formatted_address": "123 Pizza St, New York, NY",
      "geometry": {
        "location": {
          "lat": 40.712776,
          "lng": -74.005974
        }
      }
    }
  ],
  "status": "OK"
}
```

### Error Handling

Make sure to handle errors in your requests. If the API returns an error, check the status and message in the response:

```javascript
if (response.data.status !== 'OK') {
    console.error('Error fetching data:', response.data.error_message);
}
```

## API Documentation

You can explore the API in detail using the Swagger UI. To access it, navigate to the following URL after starting the application:

```
http://localhost:3000/api-docs
```

## Examples

### Example 1: Find a Restaurant

```javascript
getBusinessDetails('Italian Restaurant, San Francisco').then(data => {
    console.log(data);
});
```

### Example 2: Find a Hotel

```javascript
getBusinessDetails('Hotel California, Los Angeles').then(data => {
    console.log(data);
});
```

## Contributing

We welcome contributions to enhance this project. Here’s how you can help:

1. **Fork the repository**.
2. **Create a new branch**: `git checkout -b feature/YourFeature`.
3. **Make your changes**.
4. **Commit your changes**: `git commit -m 'Add some feature'`.
5. **Push to the branch**: `git push origin feature/YourFeature`.
6. **Create a pull request**.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or feedback, feel free to reach out via GitHub issues or directly through the repository.

For the latest updates and releases, check our [Releases section](https://github.com/DevStraight/getBusinessDetailsFromPlaces/releases).

## Acknowledgments

- **Google Places API**: For providing the data.
- **Open Source Community**: For continuous support and collaboration.

---

For further details and updates, please visit our [Releases section](https://github.com/DevStraight/getBusinessDetailsFromPlaces/releases).