
# Mood Melodies Mobile Makefile

.PHONY: setup-android setup-ios run-android run-ios reverse

setup:
	cd MoodMelodies && npm install
	cd MoodMelodies/ios && pod install

reverse:
	@echo "Applying adb reverse to all connected devices..."
	@adb devices | grep -v "List" | grep "device" | cut -f1 | xargs -I {} adb -s {} reverse tcp:8081 tcp:8081
	@adb devices | grep -v "List" | grep "device" | cut -f1 | xargs -I {} adb -s {} reverse tcp:8000 tcp:8000
	@echo "Done."

run-android: reverse
	cd MoodMelodies && npx react-native run-android

run-ios:
	cd MoodMelodies && npx react-native run-ios
