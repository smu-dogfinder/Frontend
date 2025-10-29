# 1단계: 빌드 환경 설정
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build # Frontend 빌드 실행

# 2단계: 최종 실행 환경 설정
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html # 빌드된 결과물을 NGINX 기본 경로로 복사
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
