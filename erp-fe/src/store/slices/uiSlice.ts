import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark";

export interface UiState {
    mode: ThemeMode;
}

const initialState: UiState = {
    mode: "light",
};

export const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
            state.mode = action.payload;
        },
        toggleThemeMode: (state) => {
            state.mode = state.mode === "light" ? "dark" : "light";
        },
    },
});

export const { setThemeMode, toggleThemeMode } = uiSlice.actions;
export default uiSlice.reducer;
