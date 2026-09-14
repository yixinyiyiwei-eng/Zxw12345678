import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

function ClockTimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const [hours, setHours] = useState(() => {
    if (value) return parseInt(value.split(':')[0]) || 0;
    return 9;
  });
  const [minutes, setMinutes] = useState(() => {
    if (value) return parseInt(value.split(':')[1]) || 0;
    return 0;
  });
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const hourMarkers = Array.from({ length: 12 }, (_, i) => i);
  const minuteMarkers = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleHourSelect = (hour: number) => {
    const currentIsPM = hours >= 12;
    const newHour = currentIsPM ? hour + 12 : hour;
    setHours(newHour);
    const timeStr = `${newHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeStr);
    setMode('minute');
  };

  const handleMinuteSelect = (minute: number) => {
    setMinutes(minute);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(timeStr);
  };

  const toggleAMPM = () => {
    const newHours = hours >= 12 ? hours - 12 : hours + 12;
    setHours(newHours);
    const timeStr = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeStr);
  };

  const isPM = hours >= 12;
  const displayHour = hours % 12 || 12;

  return (
    <View style={clockStyles.container}>
      {/* Digital Display */}
      <View style={clockStyles.digitalDisplay}>
        <Text style={clockStyles.digitalTime}>
          {displayHour.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
        </Text>
        <TouchableOpacity style={clockStyles.ampmButton} onPress={toggleAMPM}>
          <Text style={clockStyles.ampmText}>{isPM ? 'PM' : 'AM'}</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Switcher */}
      <View style={clockStyles.modeSwitcher}>
        <TouchableOpacity
          style={[clockStyles.modeButton, mode === 'hour' && clockStyles.modeButtonActive]}
          onPress={() => setMode('hour')}
        >
          <Text style={[clockStyles.modeText, mode === 'hour' && clockStyles.modeTextActive]}>时</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[clockStyles.modeButton, mode === 'minute' && clockStyles.modeButtonActive]}
          onPress={() => setMode('minute')}
        >
          <Text style={[clockStyles.modeText, mode === 'minute' && clockStyles.modeTextActive]}>分</Text>
        </TouchableOpacity>
      </View>

      {/* Clock Face */}
      <View style={clockStyles.clockContainer}>
        <View style={clockStyles.clockFace}>
          <View style={clockStyles.centerDot} />

          {mode === 'hour' ? (
            hourMarkers.map((hour) => {
              const angle = (hour * 30 - 90) * (Math.PI / 180);
              const radius = 70;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isSelected = (hours % 12) === hour;

              return (
                <TouchableOpacity
                  key={`hour-${hour}`}
                  style={[
                    clockStyles.hourMarker,
                    {
                      left: 90 + x - 16,
                      top: 90 + y - 16,
                    },
                    isSelected && clockStyles.hourMarkerSelected,
                  ]}
                  onPress={() => handleHourSelect(hour === 0 ? 12 : hour)}
                >
                  <Text style={[
                    clockStyles.hourText,
                    isSelected && clockStyles.hourTextSelected,
                  ]}>
                    {hour === 0 ? 12 : hour}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            minuteMarkers.map((minute) => {
              const angle = (minute * 6 - 90) * (Math.PI / 180);
              const radius = 70;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isSelected = minutes === minute;

              return (
                <TouchableOpacity
                  key={`minute-${minute}`}
                  style={[
                    clockStyles.hourMarker,
                    {
                      left: 90 + x - 16,
                      top: 90 + y - 16,
                    },
                    isSelected && clockStyles.hourMarkerSelected,
                  ]}
                  onPress={() => handleMinuteSelect(minute)}
                >
                  <Text style={[
                    clockStyles.hourText,
                    isSelected && clockStyles.hourTextSelected,
                  ]}>
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}

          {/* Hour hand */}
          <View
            style={[
              clockStyles.hand,
              clockStyles.hourHand,
              {
                transform: [
                  { rotate: `${(hours % 12) * 30 + minutes * 0.5}deg` },
                ],
              },
            ]}
          />

          {/* Minute hand */}
          <View
            style={[
              clockStyles.hand,
              clockStyles.minuteHand,
              {
                transform: [
                  { rotate: `${minutes * 6}deg` },
                ],
              },
            ]}
          />
        </View>
      </View>

      {/* Quick Minute Buttons */}
      <View style={clockStyles.quickMinuteContainer}>
        {[0, 15, 30, 45].map((minute) => (
          <TouchableOpacity
            key={`quick-${minute}`}
            style={[
              clockStyles.quickMinuteButton,
              minutes === minute && clockStyles.quickMinuteButtonActive,
            ]}
            onPress={() => handleMinuteSelect(minute)}
          >
            <Text style={[
              clockStyles.quickMinuteText,
              minutes === minute && clockStyles.quickMinuteTextActive,
            ]}>
              {minute.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const clockStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  digitalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  digitalTime: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1A202C',
    fontVariant: ['tabular-nums'],
  },
  ampmButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
  },
  ampmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D7D46',
  },
  clockContainer: {
    marginBottom: 16,
  },
  clockFace: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2D7D46',
    position: 'absolute',
    zIndex: 10,
  },
  hourMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  hourMarkerSelected: {
    backgroundColor: '#2D7D46',
  },
  hourText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  hourTextSelected: {
    color: '#FFFFFF',
  },
  hand: {
    position: 'absolute',
    bottom: '50%',
    left: '50%',
    transformOrigin: 'bottom center',
  },
  hourHand: {
    width: 3,
    height: 40,
    backgroundColor: '#1A202C',
    borderRadius: 2,
    marginLeft: -1.5,
  },
  minuteHand: {
    width: 2,
    height: 60,
    backgroundColor: '#2D7D46',
    borderRadius: 1,
    marginLeft: -1,
  },
  modeSwitcher: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeButtonActive: {
    backgroundColor: '#2D7D46',
    borderColor: '#2D7D46',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  quickMinuteContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickMinuteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickMinuteButtonActive: {
    backgroundColor: '#2D7D46',
    borderColor: '#2D7D46',
  },
  quickMinuteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  quickMinuteTextActive: {
    color: '#FFFFFF',
  },
});

export { ClockTimePicker };