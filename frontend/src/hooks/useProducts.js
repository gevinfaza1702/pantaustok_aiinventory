import { useState, useCallback } from 'react';
import { productsAPI } from '../services/api';
import { extractErrorMessage } from '../utils/formatters';

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await productsAPI.getAll(params);
      setProducts(response.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await productsAPI.getById(id);
      setProduct(response.data);
      return response.data;
    } catch (err) {
      setError(extractErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProduct = async (data) => {
    try {
      setLoading(true);
      const response = await productsAPI.create(data);
      await fetchProducts(); // Refresh list
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: extractErrorMessage(err) };
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (id, data) => {
    try {
      setLoading(true);
      const response = await productsAPI.update(id, data);
      setProduct(response.data); // Update local store
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: extractErrorMessage(err) };
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    product,
    loading,
    error,
    fetchProducts,
    fetchProductById,
    createProduct,
    updateProduct
  };
}
