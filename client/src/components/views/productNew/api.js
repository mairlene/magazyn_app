import { BASE, getAuthHeaders } from '../../../services/api';

async function parseBody(res) {
  let body = null;
  try { body = await res.json(); } catch (_) { body = { error: await res.text().catch(() => null) }; }
  return body;
}

export async function addProduct(payload, token = null) {
  const url = `${BASE || ''}/api/products`;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) }, body: JSON.stringify(payload) });
    const body = await parseBody(res);
    
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
     
    console.error('[productNew/api] addProduct error', e);
    throw e;
  }
}

export async function updateProduct(id, payload, token = null) {
  if (!id) throw new Error('Missing product id');
  const url = `${BASE || ''}/api/products/${id}`;
  try {
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) }, body: JSON.stringify(payload) });
    const body = await parseBody(res);
    
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
     
    console.error('[productNew/api] updateProduct error', e);
    throw e;
  }
}

const productApi = { addProduct, updateProduct };
export default productApi;
