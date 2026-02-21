import axios from 'axios';
const api = axios.create(
    {
        baseURL: '/'
    }
);

api.interceptors.request.use((config) => {
    
    const token = localStorage.getItem('token');
    if (token) {
        console.log(token)
        config.headers.authorization = `Bearer ${token}`;
    }
    return config
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;