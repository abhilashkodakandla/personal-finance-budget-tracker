import api from "./api";

export const getHouseholds = async () => {
  const res = await api.get("/households");
  return res.data;
};

export const createHousehold = async (payload) => {
  const res = await api.post("/households", payload);
  return res.data;
};

export const getHousehold = async (id) => {
  const res = await api.get(`/households/${id}`);
  return res.data;
};

export const updateHousehold = async (id, payload) => {
  const res = await api.patch(`/households/${id}`, payload);
  return res.data;
};

export const deleteHousehold = async (id) => {
  const res = await api.delete(`/households/${id}`);
  return res.data;
};

export const addHouseholdMember = async (id, payload) => {
  const res = await api.post(`/households/${id}/members`, payload);
  return res.data;
};

export const updateHouseholdMember = async (id, userId, payload) => {
  const res = await api.patch(`/households/${id}/members/${userId}`, payload);
  return res.data;
};

export const removeHouseholdMember = async (id, userId) => {
  const res = await api.delete(`/households/${id}/members/${userId}`);
  return res.data;
};

export const leaveHousehold = async (id) => {
  const res = await api.post(`/households/${id}/leave`);
  return res.data;
};

export const transferHouseholdOwnership = async (id, newOwnerId) => {
  const res = await api.post(`/households/${id}/transfer-ownership`, { newOwnerId });
  return res.data;
};
