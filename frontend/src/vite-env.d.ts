/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    // more env variables...
}

    readonly env: ImportMetaEnv
}

declare module '*.png' {
    const value: string;
    export default value;
}
