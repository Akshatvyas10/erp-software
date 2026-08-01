const storage = {
    getItem: (key: string) => {
        return Promise.resolve(localStorage.getItem(key));
    },

    setItem: (key: string, value: string) => {
        localStorage.setItem(key, value);
        return Promise.resolve();
    },

    removeItem: (key: string) => {
        localStorage.removeItem(key);
        return Promise.resolve();
    },
};

export default storage;