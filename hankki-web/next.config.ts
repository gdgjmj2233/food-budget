import type { NextConfig } from "next";

// GitHub Pages처럼 하위 주소(/저장소이름)에 정적 파일로 올릴 때만 PAGES_BASE_PATH 를 지정한다.
// 그때만 out/ 폴더로 내보내고(output: export) 주소 앞에 basePath 를 붙인다. (로컬 실행에는 영향 없음)
// 정적 파일로 내보내야 해서 서버 기능인 Cache Components 는 켜지 않는다.
const pagesBasePath = process.env.PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  ...(pagesBasePath !== undefined ? { output: "export", basePath: pagesBasePath } : {}),
};

export default nextConfig;
