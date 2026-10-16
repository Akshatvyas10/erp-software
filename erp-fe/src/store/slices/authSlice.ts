import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types/erp";

interface AuthState {
    token: string | null;
    user: User | null;
    isInitializing: boolean;
}

const initialState: AuthState = {
    token: null,
    user: null,
    isInitializing: true,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        /**
         * Called on login — stores ONLY the access token and safe user object.
         * NO roles or permissions stored here — they come from the encrypted
         * GET /api/permissions/my endpoint after login.
         */
        loginSuccess: (
            state,
            action: PayloadAction<{ token: string; user: User }>
        ) => {
            state.token = action.payload.token;
            state.user = action.payload.user;
            state.isInitializing = false;
        },

        updateToken: (state, action: PayloadAction<string>) => {
            state.token = action.payload;
            state.isInitializing = false;
        },

        setInitialized: (state) => {
            state.isInitializing = false;
        },

        logout: (state) => {
            state.token = null;
            state.user = null;
            state.isInitializing = false;
        },
    },
});

export const { loginSuccess, updateToken, setInitialized, logout } = authSlice.actions;
export default authSlice.reducer;
