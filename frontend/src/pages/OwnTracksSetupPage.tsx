import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import Navbar from '../components/Navbar';
import {
  Smartphone,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  Apple,
  Package,
  Settings,
  Radio,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Platform = 'ios' | 'android';

export default function OwnTracksSetupPage() {
  const { token } = useAuthStore();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('ios');
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const serverUrl = `${window.location.origin}/api/owntracks`;

  const copyToClipboard = async (text: string, type: 'token' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'token') {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-16 px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Smartphone className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              OwnTracks Setup
            </h1>
            <p className="text-gray-600">
              Set up automatic location sharing from your mobile device
            </p>
          </div>

          {/* What is OwnTracks */}
          <div className="card mb-6">
            <div className="flex items-start gap-3 mb-4">
              <Radio className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  What is OwnTracks?
                </h2>
                <p className="text-gray-600 mb-3">
                  OwnTracks is a free, open-source mobile app that automatically shares your location
                  with Family Tracker. It works in the background, so you don't need to manually
                  update your location.
                </p>
                <div className="flex items-center gap-2 text-sm text-primary-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Free and open source</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Privacy-focused</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Automatic background updates</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 1: Download */}
          <div className="card mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Download OwnTracks
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href="https://apps.apple.com/app/owntracks/id692424691"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary flex items-center justify-center gap-2"
                  >
                    <Apple className="w-5 h-5" />
                    Download for iOS
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=org.owntracks.android"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download for Android
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Get Your Token */}
          <div className="card mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Copy Your Authentication Token
                </h2>

                {token ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Token:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={token}
                          readOnly
                          className="input flex-1 font-mono text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(token, 'token')}
                          className="btn btn-secondary flex items-center gap-2"
                        >
                          {copiedToken ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Server URL:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={serverUrl}
                          readOnly
                          className="input flex-1 font-mono text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(serverUrl, 'url')}
                          className="btn btn-secondary flex items-center gap-2"
                        >
                          {copiedUrl ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="w-5 h-5" />
                      <p>Please log in to get your authentication token.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Configure OwnTracks */}
          <div className="card mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Configure OwnTracks
                </h2>

                {/* Platform Tabs */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setSelectedPlatform('ios')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedPlatform === 'ios'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Apple className="w-4 h-4" />
                      iOS
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedPlatform('android')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedPlatform === 'android'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Android
                    </div>
                  </button>
                </div>

                {/* iOS Instructions */}
                {selectedPlatform === 'ios' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Configuration Steps:</h3>
                      <ol className="space-y-3 text-sm text-gray-700">
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">1.</span>
                          <span>Open OwnTracks and tap the menu icon (☰) in the top left</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">2.</span>
                          <span>Tap <strong>Settings</strong></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">3.</span>
                          <span>Under <strong>Connection</strong>, set Mode to <strong>HTTP</strong></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">4.</span>
                          <div>
                            <span>Configure <strong>HTTP Settings</strong>:</span>
                            <ul className="ml-4 mt-1 space-y-1">
                              <li>• URL: <code className="bg-white px-1 rounded">{serverUrl}</code></li>
                              <li>• Authentication: <strong>ON</strong></li>
                              <li>• User ID: Your email address</li>
                              <li>• Password: Leave empty</li>
                              <li>• Device ID: Any unique identifier (e.g., "iphone")</li>
                              <li>• Tracker ID: Your initials (2 characters)</li>
                            </ul>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">5.</span>
                          <div>
                            <span>Add <strong>HTTP Headers</strong>:</span>
                            <ul className="ml-4 mt-1 space-y-1">
                              <li>• Tap <strong>HTTP Headers</strong></li>
                              <li>• Add a new header</li>
                              <li>• Key: <code className="bg-white px-1 rounded">Authorization</code></li>
                              <li>• Value: <code className="bg-white px-1 rounded">Bearer {token ? token.substring(0, 20) + '...' : 'YOUR_TOKEN'}</code></li>
                            </ul>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">6.</span>
                          <span>Tap <strong>Done</strong> to save</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Android Instructions */}
                {selectedPlatform === 'android' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Configuration Steps:</h3>
                      <ol className="space-y-3 text-sm text-gray-700">
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">1.</span>
                          <span>Open OwnTracks and tap the menu icon (☰) in the top left</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">2.</span>
                          <span>Tap <strong>Preferences</strong></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">3.</span>
                          <span>Under <strong>Connection</strong>, set Mode to <strong>HTTP</strong></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">4.</span>
                          <div>
                            <span>Configure <strong>Connection Settings</strong>:</span>
                            <ul className="ml-4 mt-1 space-y-1">
                              <li>• URL: <code className="bg-white px-1 rounded">{serverUrl}</code></li>
                              <li>• Authentication: <strong>Enabled</strong></li>
                              <li>• Username: Your email address</li>
                              <li>• Password: Leave empty</li>
                              <li>• Device ID: Any unique identifier (e.g., "android-phone")</li>
                              <li>• Tracker ID: Your initials (2 characters)</li>
                            </ul>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">5.</span>
                          <div>
                            <span>Scroll to <strong>Advanced</strong> and add <strong>Custom HTTP Headers</strong>:</span>
                            <ul className="ml-4 mt-1 space-y-1">
                              <li>• Name: <code className="bg-white px-1 rounded">Authorization</code></li>
                              <li>• Value: <code className="bg-white px-1 rounded">Bearer {token ? token.substring(0, 20) + '...' : 'YOUR_TOKEN'}</code></li>
                            </ul>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-primary-600">6.</span>
                          <span>Tap back to save your settings</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: Test Connection */}
          <div className="card mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                4
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Test the Connection
                </h2>
                <div className="space-y-3 text-gray-700">
                  <p>After configuring OwnTracks:</p>
                  <ol className="space-y-2 ml-4">
                    <li className="flex gap-2">
                      <span className="font-bold text-primary-600">1.</span>
                      <span>Pull down to refresh or move to a new location in the app</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-primary-600">2.</span>
                      <span>Look for a successful upload indicator in OwnTracks</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-primary-600">3.</span>
                      <span>Open Family Tracker web interface and check if your location appears on the map</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="card">
            <div className="flex items-start gap-3">
              <Settings className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Troubleshooting
                </h2>
                <div className="space-y-4 text-sm text-gray-700">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Location Not Updating?</h3>
                    <ul className="space-y-1 ml-4">
                      <li>• Ensure the Authorization header is set correctly with "Bearer" prefix</li>
                      <li>• Check that the server URL is correct: <code className="bg-gray-100 px-1 rounded">{serverUrl}</code></li>
                      <li>• Verify you're a member of a family (go to Family page)</li>
                      <li>• Check OwnTracks logs for error messages</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Token Expired?</h3>
                    <p className="ml-4">
                      Tokens expire after 30 days. If your location stops updating, log out and log back in to get a new token, then update it in OwnTracks.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Permission Issues?</h3>
                    <ul className="space-y-1 ml-4">
                      <li>• <strong>iOS:</strong> Settings → Privacy → Location Services → OwnTracks → Always</li>
                      <li>• <strong>Android:</strong> Settings → Apps → OwnTracks → Permissions → Location → All the time</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
