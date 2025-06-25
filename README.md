# 🏢 Business Details API 🌍  

**Retrieve Google Places business information with ease!**  

## ✨ Features  
- 🔍 Search businesses by **name, address, and postal code**  
- 📦 Returns **French-formatted** data (`nom`, `adresse`, `geolocalisation`)  
- ⚡ Fast & reliable Google Places API integration  
- 📄 Comprehensive **Swagger documentation**  

## 🚀 Quick Start  

### 1. Install dependencies  
```bash  
npm install  
```  

### 2. Configure  
Create `.env` file:  
```env  
GOOGLE_PLACES_API_KEY=your_api_key_here  
PORT=3000  
```  

### 3. Run  
```bash  
npm start  
```  

## 📚 API Documentation  
Access interactive docs at:  
`http://localhost:3000/api-docs`  

## 📋 Example Response  
```json  
{
  "nom": "Musée du Louvre",
  "adresse": "Rue de Rivoli, 75001 Paris, France",
  "geolocalisation": {
    "lat": 48.860611,
    "lon": 2.337644
  },
  "phone": "+33 1 40 20 53 17",
  "website": "http://www.louvre.fr/"
}
```  

## 📜 License  
MIT © Victor Baumgartner  

---

🔗 **Tip**: Use Postman or Insomnia to test the API endpoints!  

*Made with ❤️ and TypeScript*
