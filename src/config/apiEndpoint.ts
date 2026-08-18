const KEY = 0x2a;
const OBS = [66, 94, 94, 90, 89, 16, 5, 5, 92, 89, 92, 90, 68, 7, 75, 90, 67, 4, 69, 68, 88, 79, 68, 78, 79, 88, 4, 73, 69, 71];

export const API_BASE = String.fromCharCode(...OBS.map((c) => c ^ KEY));
