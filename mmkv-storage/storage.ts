import { MMKV } from "react-native-mmkv";
 
export const storage = new MMKV({
  id: "user-storage",
  encryptionKey: "gndthinxloguser-341", // 🔑 keep this secure
});
 
export const saveUser = (user: any) => {
  storage.set("user", JSON.stringify(user));
};
 
export const getUser = (): any | null => {
  const userData = storage.getString("user");
  return userData ? JSON.parse(userData) : null;
};
 
export const clearUser = () => {
  storage.delete("user");
};
 
export const saveTrip = (tripData: any) => {
  const existingTrips = getTrips() || [];
  const trips = [...existingTrips, tripData];
  storage.set("trips", JSON.stringify(trips));
};
 
export const updateTrip = (deviceID: string, updates: any) => {
  const existingTrips = getTrips() || [];
  let updated = false;
  const updatedTrips = existingTrips.map((trip: any) => {
    if (!updated && trip.deviceID === deviceID && trip.status === 'Started') {
      updated = true;
      return { ...trip, ...updates };
    }
    return trip;
  });
  storage.set("trips", JSON.stringify(updatedTrips));
};
 
export const getTrips = (): any | null => {
  const userData = storage.getString("trips");
  return userData ? JSON.parse(userData) : null;
};
 
export const clearTrip = () => {
  storage.delete("trips");
};

export const clearAllTrips = () => {
  storage.delete("trips");
};

export const deleteSelectedTrips = (deviceIDs: string[]) => {
  const existingTrips = getTrips() || [];
  const updatedTrips = existingTrips.filter((trip: any) => !deviceIDs.includes(trip.deviceID));
  storage.set("trips", JSON.stringify(updatedTrips));
};

// Generic data storage for temporary trip data
export const saveData = (key: string, data: any) => {
  storage.set(key, JSON.stringify(data));
};

export const getData = (key: string): any | null => {
  const data = storage.getString(key);
  return data ? JSON.parse(data) : null;
};

export const clearData = (key: string) => {
  storage.delete(key);
};