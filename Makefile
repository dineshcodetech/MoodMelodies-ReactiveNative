# ============================================================================
# Mood Melodies - Makefile
# ============================================================================

.PHONY: setup setup-mobile setup-backend \
        run-android run-ios reverse \
        docker-build docker-build-signaling docker-build-translation docker-build-full \
        docker-up docker-down docker-logs docker-clean \
        test lint help

# ============================================================================
# Mobile App Commands
# ============================================================================

setup: setup-mobile setup-backend
	@echo "✅ Full setup complete!"

setup-mobile:
	@echo "📱 Setting up mobile app..."
	cd MoodMelodies && npm install
	cd MoodMelodies/ios && pod install
	@echo "✅ Mobile app setup complete!"

reverse:
	@echo "🔄 Applying adb reverse to all connected devices..."
	@adb devices | grep -v "List" | grep "device" | cut -f1 | xargs -I {} adb -s {} reverse tcp:8081 tcp:8081
	@adb devices | grep -v "List" | grep "device" | cut -f1 | xargs -I {} adb -s {} reverse tcp:3000 tcp:3000
	@adb devices | grep -v "List" | grep "device" | cut -f1 | xargs -I {} adb -s {} reverse tcp:5001 tcp:5001
	@echo "✅ ADB reverse complete!"

run-android: reverse
	cd MoodMelodies && npx react-native run-android

run-ios:
	cd MoodMelodies && npx react-native run-ios

# ============================================================================
# Backend Setup Commands
# ============================================================================

setup-backend:
	@echo "🔧 Setting up backend services..."
	cd signaling-server && npm install
	cd translation-service && pip install -r requirements.txt
	@echo "✅ Backend setup complete!"

# ============================================================================
# Docker Commands
# ============================================================================

# Build individual service images
docker-build-signaling:
	@echo "🐳 Building Signaling Server image..."
	docker build --target signaling-runtime -t moodmelodies-signaling:latest .

docker-build-translation:
	@echo "🐳 Building Translation Service image..."
	docker build --target translation-runtime -t moodmelodies-translation:latest .

# Build full combined backend image
docker-build-full:
	@echo "🐳 Building Full Backend image..."
	docker build --target full-backend -t moodmelodies-backend:latest .

# Build all images
docker-build: docker-build-signaling docker-build-translation
	@echo "✅ All Docker images built!"

# Start services with docker-compose
docker-up:
	@echo "🚀 Starting all services..."
	cd infrastructure && docker-compose up -d
	@echo "✅ Services started!"
	@echo "   📡 Signaling Server: http://localhost:3000"
	@echo "   🌐 Translation Service: http://localhost:5001"
	@echo "   💾 Redis: localhost:6379"

# Start services with logs
docker-up-logs:
	@echo "🚀 Starting all services with logs..."
	cd infrastructure && docker-compose up

# Stop all services
docker-down:
	@echo "🛑 Stopping all services..."
	cd infrastructure && docker-compose down
	@echo "✅ Services stopped!"

# Stop and remove volumes
docker-clean:
	@echo "🧹 Cleaning up Docker resources..."
	cd infrastructure && docker-compose down -v --rmi local
	docker image prune -f
	@echo "✅ Cleanup complete!"

# View logs
docker-logs:
	cd infrastructure && docker-compose logs -f

docker-logs-signaling:
	cd infrastructure && docker-compose logs -f signaling

docker-logs-translation:
	cd infrastructure && docker-compose logs -f translation

# Restart specific service
docker-restart-signaling:
	cd infrastructure && docker-compose restart signaling

docker-restart-translation:
	cd infrastructure && docker-compose restart translation

# ============================================================================
# Development Commands
# ============================================================================

dev-signaling:
	cd signaling-server && npm run dev

dev-translation:
	cd translation-service && python -m flask --app src.app run --debug --port 7777

# ============================================================================
# Testing Commands
# ============================================================================

test:
	@echo "🧪 Running all tests..."
	cd signaling-server && npm test
	cd translation-service && pytest
	@echo "✅ All tests complete!"

test-signaling:
	cd signaling-server && npm test

test-translation:
	cd translation-service && pytest

# ============================================================================
# Linting Commands
# ============================================================================

lint:
	@echo "🔍 Running linters..."
	cd signaling-server && npm run lint
	@echo "✅ Linting complete!"

# ============================================================================
# Health Check Commands
# ============================================================================

health:
	@echo "🏥 Checking service health..."
	@curl -s http://localhost:3000/health && echo " ✅ Signaling Server OK" || echo " ❌ Signaling Server DOWN"
	@curl -s http://localhost:5001/health && echo " ✅ Translation Service OK" || echo " ❌ Translation Service DOWN"

# ============================================================================
# Help
# ============================================================================

help:
	@echo ""
	@echo "🎵 Mood Melodies - Available Commands"
	@echo "============================================"
	@echo ""
	@echo "📱 Mobile App:"
	@echo "   make setup-mobile      - Install mobile dependencies"
	@echo "   make run-android       - Run on Android device/emulator"
	@echo "   make run-ios           - Run on iOS simulator"
	@echo "   make reverse           - Setup ADB reverse for Android"
	@echo ""
	@echo "🐳 Docker:"
	@echo "   make docker-up         - Start all services (background)"
	@echo "   make docker-up-logs    - Start all services (with logs)"
	@echo "   make docker-down       - Stop all services"
	@echo "   make docker-build      - Build all Docker images"
	@echo "   make docker-clean      - Clean up Docker resources"
	@echo "   make docker-logs       - View service logs"
	@echo ""
	@echo "🔧 Development:"
	@echo "   make setup-backend     - Install backend dependencies"
	@echo "   make dev-signaling     - Run signaling server (dev mode)"
	@echo "   make dev-translation   - Run translation service (dev mode)"
	@echo ""
	@echo "🧪 Testing:"
	@echo "   make test              - Run all tests"
	@echo "   make lint              - Run linters"
	@echo "   make health            - Check service health"
	@echo ""
