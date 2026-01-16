'use client';

import React, { useState, useEffect } from 'react';
import { FaUniversalAccess, FaTextHeight, FaEye, FaKeyboard, FaMinus, FaPlus, FaTimes } from 'react-icons/fa';

interface AccessibilitySettings {
    fontSize: number;
    colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
    reducedMotion: boolean;
    highContrast: boolean;
}

export default function AccessibilityToolbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState<AccessibilitySettings>({
        fontSize: 100,
        colorBlindMode: 'none',
        reducedMotion: false,
        highContrast: false
    });

    useEffect(() => {
        // Load saved settings
        const saved = localStorage.getItem('a11y-settings');
        if (saved) {
            setSettings(JSON.parse(saved));
        }

        // Check system preference for reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setSettings(prev => ({ ...prev, reducedMotion: true }));
        }
    }, []);

    useEffect(() => {
        // Save settings
        localStorage.setItem('a11y-settings', JSON.stringify(settings));

        // Apply font size
        document.documentElement.style.fontSize = `${settings.fontSize}%`;

        // Apply color blind mode
        document.documentElement.setAttribute('data-colorblind', settings.colorBlindMode);

        // Apply high contrast
        if (settings.highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }

        // Apply reduced motion
        if (settings.reducedMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
    }, [settings]);

    const adjustFontSize = (delta: number) => {
        setSettings(prev => ({
            ...prev,
            fontSize: Math.max(75, Math.min(150, prev.fontSize + delta))
        }));
    };

    const resetSettings = () => {
        setSettings({
            fontSize: 100,
            colorBlindMode: 'none',
            reducedMotion: false,
            highContrast: false
        });
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="
          fixed bottom-6 right-6 z-50
          w-14 h-14 bg-indigo-600 text-white rounded-full
          shadow-lg hover:bg-indigo-700 transition-all
          flex items-center justify-center
          focus:ring-4 focus:ring-indigo-300
        "
                aria-label="Open accessibility toolbar"
            >
                <FaUniversalAccess className="text-2xl" />
            </button>

            {/* Toolbar Panel */}
            {isOpen && (
                <div className="
          fixed bottom-24 right-6 z-50
          w-80 bg-white rounded-lg shadow-2xl border border-gray-200
          animate-slide-in-up
        ">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <FaUniversalAccess className="text-indigo-600" />
                            Accessibility
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            aria-label="Close accessibility toolbar"
                        >
                            <FaTimes />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
                        {/* Font Size */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <FaTextHeight className="text-gray-600" />
                                <label className="font-semibold text-gray-900">Text Size</label>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => adjustFontSize(-10)}
                                    disabled={settings.fontSize <= 75}
                                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Decrease text size"
                                >
                                    <FaMinus />
                                </button>
                                <div className="flex-1 text-center">
                                    <span className="text-lg font-bold text-gray-900">{settings.fontSize}%</span>
                                </div>
                                <button
                                    onClick={() => adjustFontSize(10)}
                                    disabled={settings.fontSize >= 150}
                                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Increase text size"
                                >
                                    <FaPlus />
                                </button>
                            </div>
                            <input
                                type="range"
                                min="75"
                                max="150"
                                step="5"
                                value={settings.fontSize}
                                onChange={(e) => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                                className="w-full mt-2"
                                aria-label="Text size slider"
                            />
                        </div>

                        {/* Color Blind Mode */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <FaEye className="text-gray-600" />
                                <label className="font-semibold text-gray-900">Color Blind Mode</label>
                            </div>
                            <select
                                value={settings.colorBlindMode}
                                onChange={(e) => setSettings(prev => ({ ...prev, colorBlindMode: e.target.value as any }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                aria-label="Select color blind mode"
                            >
                                <option value="none">None (Default)</option>
                                <option value="protanopia">Protanopia (Red-Blind)</option>
                                <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
                                <option value="tritanopia">Tritanopia (Blue-Blind)</option>
                            </select>
                        </div>

                        {/* High Contrast */}
                        <div className="flex items-center justify-between">
                            <label htmlFor="high-contrast" className="font-semibold text-gray-900">
                                High Contrast Mode
                            </label>
                            <button
                                id="high-contrast"
                                onClick={() => setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }))}
                                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${settings.highContrast ? 'bg-indigo-600' : 'bg-gray-300'}
                `}
                                role="switch"
                                aria-checked={settings.highContrast}
                            >
                                <span
                                    className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${settings.highContrast ? 'translate-x-6' : 'translate-x-1'}
                  `}
                                />
                            </button>
                        </div>

                        {/* Reduced Motion */}
                        <div className="flex items-center justify-between">
                            <label htmlFor="reduced-motion" className="font-semibold text-gray-900">
                                Reduce Motion
                            </label>
                            <button
                                id="reduced-motion"
                                onClick={() => setSettings(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }))}
                                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${settings.reducedMotion ? 'bg-indigo-600' : 'bg-gray-300'}
                `}
                                role="switch"
                                aria-checked={settings.reducedMotion}
                            >
                                <span
                                    className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'}
                  `}
                                />
                            </button>
                        </div>

                        {/* Keyboard Shortcuts Info */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <FaKeyboard className="text-blue-600" />
                                <h4 className="font-semibold text-blue-900 text-sm">Keyboard Shortcuts</h4>
                            </div>
                            <ul className="text-xs text-blue-800 space-y-1">
                                <li><kbd className="px-1 bg-white rounded border">Tab</kbd> Navigate forward</li>
                                <li><kbd className="px-1 bg-white rounded border">Shift+Tab</kbd> Navigate back</li>
                                <li><kbd className="px-1 bg-white rounded border">Enter</kbd> Activate</li>
                                <li><kbd className="px-1 bg-white rounded border">Esc</kbd> Close dialogs</li>
                            </ul>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t p-4">
                        <button
                            onClick={resetSettings}
                            className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition"
                        >
                            Reset to Defaults
                        </button>
                    </div>
                </div>
            )}

            {/* Skip Links */}
            <div className="sr-only focus-within:not-sr-only">
                <a
                    href="#main-content"
                    className="
            fixed top-4 left-4 z-50
            px-4 py-2 bg-indigo-600 text-white rounded-lg
            focus:outline-none focus:ring-4 focus:ring-indigo-300
          "
                >
                    Skip to main content
                </a>
            </div>
        </>
    );
}
