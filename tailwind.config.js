export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "./**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#D35055',
          primaryDark: '#9C6761',
          ink: '#141216',
          muted: '#5E5A63',
          surface: '#FFFFFF',
          surfaceMuted: '#F7F6F8',
          border: '#E7E4E8',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(20, 18, 22, 0.08)',
      },
    },
  },
  plugins: [],
};
