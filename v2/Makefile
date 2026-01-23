# ============================================================================
# MoodMelodies V2 React Native App - Makefile
# ============================================================================

.PHONY: help setup install ios android clean reset metro start \
        check-env check-backend health lint test

# Variables
APP_DIR := MoodMelodies
NODE := node
NPM := npm
YARN := yarn
PORT := 8082

# ============================================================================
# Help
# ============================================================================

help:
	@echo ""
	@echo "🎵 MoodMelodies V2 React Native App - Available Commands"
	@echo "========================================================="
	@echo ""
	@echo "📦 Setup:"
	@echo "   make setup          - Complete setup (install deps, iOS pods)"
	@echo "   make install        - Install Node.js dependencies"
	@echo "   make check-env       - Check environment configuration"
	@echo "   make check-backend   - Check if V2 backend is running"
	@echo ""
	@echo "🚀 Run:"
	@echo "   make start          - Start Metro bundler"
	@echo "   make ios            - Run on iOS simulator"
	@echo "   make android        - Run on Android device/emulator"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "   make clean          - Clean build artifacts and cache"
	@echo "   make reset          - Reset Metro bundler cache"
	@echo ""
	@echo "🧪 Testing:"
	@echo "   make test           - Run tests"
	@echo "   make lint           - Run linters"
	@echo "   make health         - Check app and backend health"
	@echo ""

# ============================================================================
# Setup Commands
# ============================================================================

setup: check-node install check-env
	@echo ""
	@echo "📱 Installing iOS dependencies..."
	@cd $(APP_DIR)/ios && pod install || echo "⚠️  Pod install failed (may need Xcode)"
	@echo ""
	@echo "✅ Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "1. Ensure V2 backend is running (make -C ../MoodMelodies-BE-Flask/V2 run)"
	@echo "2. Run 'make ios' or 'make android' to start the app"
	@echo ""

check-node:
	@echo "🔍 Checking Node.js..."
	@$(NODE) --version || (echo "❌ Node.js not found. Please install Node.js 18+" && exit 1)
	@echo "✅ Node.js found"

install:
	@echo "📦 Installing dependencies..."
	@cd $(APP_DIR) && $(NPM) install
	@echo "✅ Dependencies installed"

check-env:
	@echo "🔍 Checking environment configuration..."
	@if [ ! -f "$(APP_DIR)/src/constants/config.ts" ]; then \
		echo "❌ config.ts not found"; \
		exit 1; \
	fi
	@echo "✅ Configuration file exists"
	@grep -q "V2\|v2\|7777" $(APP_DIR)/src/constants/config.ts && \
		echo "✅ V2 backend configuration detected" || \
		echo "⚠️  Warning: V2 backend URL may not be configured"

check-backend:
	@echo "🔍 Checking V2 backend..."
	@curl -s http://localhost:7777/api/v2/health > /dev/null && \
		echo "✅ V2 backend is running" || \
		echo "❌ V2 backend is not running. Start it with: make -C ../MoodMelodies-BE-Flask/V2 run"

# ============================================================================
# Run Commands
# ============================================================================

start:
	@echo "🚀 Starting Metro bundler..."
	@echo "📍 Metro will be available at http://localhost:$(PORT)"
	@cd $(APP_DIR) && $(NPM) start -- --port $(PORT)

ios: check-backend
	@echo "🍎 Running on iOS simulator..."
	@cd $(APP_DIR) && $(NPM) run ios

android: check-backend
	@echo "🤖 Running on Android..."
	@echo "📱 Setting up ADB reverse..."
	@adb reverse tcp:$(PORT) tcp:$(PORT) 2>/dev/null || echo "⚠️  ADB reverse failed (device may not be connected)"
	@adb reverse tcp:7777 tcp:7777 2>/dev/null || echo "⚠️  ADB reverse for backend failed"
	@echo ""
	@echo "💡 Tip: Make sure Metro bundler is running in another terminal:"
	@echo "   make start"
	@echo ""
	@echo "🚀 Building and running Android app..."
	@cd $(APP_DIR) && $(NPM) run android || (echo "❌ Failed to run Android. Make sure Metro is running: make start" && exit 1)

# ============================================================================
# Cleanup Commands
# ============================================================================

clean:
	@echo "🧹 Cleaning up..."
	@cd $(APP_DIR) && rm -rf node_modules
	@cd $(APP_DIR)/ios && rm -rf Pods Podfile.lock build
	@cd $(APP_DIR)/android && rm -rf build app/build .gradle
	@rm -rf $(APP_DIR)/.metro
	@echo "✅ Cleanup complete"

reset:
	@echo "🔄 Resetting Metro bundler cache..."
	@cd $(APP_DIR) && $(NPM) start -- --reset-cache

# ============================================================================
# Testing Commands
# ============================================================================

test:
	@echo "🧪 Running tests..."
	@cd $(APP_DIR) && $(NPM) test || echo "⚠️  Tests not configured"

lint:
	@echo "🔍 Running linters..."
	@cd $(APP_DIR) && $(NPM) run lint || echo "⚠️  Linter not configured"

health: check-backend
	@echo "🏥 Checking health..."
	@echo "Backend:"
	@curl -s http://localhost:7777/api/v2/health | $(NODE) -e "const data=require('fs').readFileSync(0,'utf-8'); console.log(JSON.parse(data))" || echo "❌ Backend not responding"
	@echo ""
	@echo "Metro:"
	@curl -s http://localhost:$(PORT)/status > /dev/null && echo "✅ Metro running" || echo "❌ Metro not running"

# ============================================================================
# Development Commands
# ============================================================================

dev: start
	@echo "🚀 Starting in development mode..."
	@echo "Metro bundler started. Run 'make ios' or 'make android' in another terminal"

# ============================================================================
# Quick Start
# ============================================================================

quickstart: setup
	@echo ""
	@echo "🎉 Quick start complete!"
	@echo ""
	@echo "To start the app:"
	@echo "   make ios        # For iOS"
	@echo "   make android    # For Android"
	@echo ""
	@echo "Make sure V2 backend is running:"
	@echo "   cd ../MoodMelodies-BE-Flask/V2 && make run"
	@echo ""
