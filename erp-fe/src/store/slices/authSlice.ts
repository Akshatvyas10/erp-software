import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types/erp";

interface AuthState {
    token: string | null;
    user: User | null;
}

const initialState: AuthState = {
    token: null,
    user: null,
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
        },

        updateToken: (state, action: PayloadAction<string>) => {
            state.token = action.payload;
        },

        logout: (state) => {
            state.token = null;
            state.user = null;
        },
    },
});

export const { loginSuccess, updateToken, logout } = authSlice.actions;
export default authSlice.reducer;
