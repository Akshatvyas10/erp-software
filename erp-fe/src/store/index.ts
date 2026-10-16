import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
import storage from "./storage";
import authReducer from "./slices/authSlice";
import permissionReducer, { permissionInitialState } from "./slices/permissionSlice";
import uiReducer from "./slices/uiSlice";

// Persist auth (Persist safe user info only, NEVER token or transient flags in localStorage)
const authPersistConfig = {
    key: "erp-auth",
    storage,
    version: 1,
    blacklist: ["token", "isInitializing"],
};

// Persist UI preferences (dark mode)
const uiPersistConfig = {
    key: "erp-ui",
    storage,
    version: 1,
};

const rootReducer = combineReducers({
    auth: persistReducer(authPersistConfig, authReducer),
    ui: persistReducer(uiPersistConfig, uiReducer),
    // permissions is intentionally NOT persisted — always starts fresh
    permissions: permissionReducer,
});

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore redux-persist action types
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }),
    preloadedState: {
        // Always boot permissions slice clean
        permissions: permissionInitialState,
    },
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
