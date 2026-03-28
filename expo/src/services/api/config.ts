import axios from 'axios';

//export const BASE_URL = 'https://staging-bff-mental-mabyu.ondigitalocean.app/';
//const BASE_URL = 'https://api-mmg-dn7ex.ondigitalocean.app/';
export const BASE_URL = 'https://mental-bff-m2iw9.ondigitalocean.app/';


export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Segunda API
export const secondaryApiClient = axios.create({
  // baseURL: 'https://api-open-ai-t4vmi.ondigitalocean.app/',
  baseURL: 'https://api-open-ai-newera-ohx84.ondigitalocean.app/',
  timeout: 60000,
  headers: {
   'Content-Type': 'multipart/form-data'

  },
});