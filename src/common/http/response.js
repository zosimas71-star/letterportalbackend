export const sendOk = (res, data, status = 200) => res.status(status).json({ success: true, data });
export const sendCreated = (res, data) => sendOk(res, data, 201);
export const sendMessage = (res, message, status = 200) => res.status(status).json({ success: true, message });
export const sendPage = (res, data, meta) => res.status(200).json({ success: true, data, meta });
