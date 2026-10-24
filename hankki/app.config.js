// app.json 설정을 그대로 쓰되, GitHub Pages처럼 하위 주소(/저장소이름)에 올릴 때만
// EXPO_BASE_URL 환경 변수로 baseUrl을 지정한다. (로컬 실행과 Expo Go에는 영향 없음)
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
