import React, { useState, useRef, useEffect } from 'react';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  dailyLimit: number;
  takenToday: number;
  instructions: string;
}

interface Astronaut {
  id: string;
  name: string;
  role: string;
  lastAccess: string;
  medications: Medication[];
}

interface InventoryData {
  current: number;
  predicted: number;
  usage: number;
  expiry: string;
}

interface Transaction {
  id: number;
  astronaut: string;
  astronautId: string;
  medications: Array<{ name: string; dosage: string; quantity: number }>;
  timestamp: string;
  status: string;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'dispense' | 'inventory' | 'unlocked'>('home');
  const [cameraActive, setCameraActive] = useState(false);
  const [recognizedAstronaut, setRecognizedAstronaut] = useState<Astronaut | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [lockStatus, setLockStatus] = useState<'locked' | 'unlocked' | 'error'>('locked');
  const [unlockCountdown, setUnlockCountdown] = useState(0);
  const [selectedMedications, setSelectedMedications] = useState<Record<string, number>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [inventory, setInventory] = useState<Record<string, InventoryData>>({
    'ibuprofen': { current: 245, predicted: 180, usage: 12, expiry: '2026-03-15' },
    'antihistamine': { current: 30, predicted: 90, usage: 8, expiry: '2025-12-20' },
    'melatonin': { current: 15, predicted: 45, usage: 5, expiry: '2026-01-10' },
    'vitamin_d': { current: 180, predicted: 120, usage: 15, expiry: '2026-06-30' },
    'antibiotic': { current: 50, predicted: 20, usage: 2, expiry: '2025-11-15' }
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const astronautDatabase: Record<string, Astronaut> = {
    'astronaut_1': {
      id: 'astronaut_1',
      name: 'Commander Sarah Chen',
      role: 'Mission Commander',
      lastAccess: '2 hours ago',
      medications: [
        { 
          id: 'ibuprofen', 
          name: 'Ibuprofen', 
          dosage: '200mg', 
          frequency: 'As needed',
          dailyLimit: 6,
          takenToday: 2,
          instructions: 'Take with food. Maximum 1200mg per day.'
        },
        { 
          id: 'antihistamine', 
          name: 'Antihistamine', 
          dosage: '10mg', 
          frequency: 'Daily',
          dailyLimit: 1,
          takenToday: 0,
          instructions: 'Take before sleep if drowsiness occurs.'
        },
        { 
          id: 'vitamin_d', 
          name: 'Vitamin D', 
          dosage: '1000 IU', 
          frequency: 'Daily',
          dailyLimit: 1,
          takenToday: 1,
          instructions: 'Take with breakfast.'
        }
      ]
    },
    'astronaut_2': {
      id: 'astronaut_2',
      name: 'Dr. Michael Torres',
      role: 'Medical Officer',
      lastAccess: '6 hours ago',
      medications: [
        { 
          id: 'melatonin', 
          name: 'Melatonin', 
          dosage: '3mg', 
          frequency: 'Before sleep',
          dailyLimit: 2,
          takenToday: 0,
          instructions: 'Take 30 minutes before bedtime.'
        },
        { 
          id: 'vitamin_d', 
          name: 'Vitamin D', 
          dosage: '1000 IU', 
          frequency: 'Daily',
          dailyLimit: 1,
          takenToday: 1,
          instructions: 'Take with breakfast.'
        }
      ]
    }
  };

  const logTransaction = () => {
    if (!recognizedAstronaut) return;
    
    const transaction: Transaction = {
      id: Date.now(),
      astronaut: recognizedAstronaut.name,
      astronautId: recognizedAstronaut.id,
      medications: Object.entries(selectedMedications)
        .filter(([_, qty]) => qty > 0)
        .map(([medId, qty]) => {
          const med = recognizedAstronaut.medications.find(m => m.id === medId)!;
          return { name: med.name, dosage: med.dosage, quantity: qty };
        }),
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    
    setTransactions(prev => [transaction, ...prev].slice(0, 50));
  };

  const updateInventory = () => {
    const updated = { ...inventory };
    Object.entries(selectedMedications).forEach(([medId, qty]) => {
      if (qty > 0 && updated[medId]) {
        updated[medId].current -= qty;
      }
    });
    setInventory(updated);
  };

  const unlockCabinet = async () => {
    setLockStatus('unlocked');
    setUnlockCountdown(30);
    logTransaction();
    updateInventory();
    return true;
  };

  useEffect(() => {
    if (unlockCountdown > 0) {
      const timer = setTimeout(() => {
        setUnlockCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (unlockCountdown === 0 && lockStatus === 'unlocked') {
      setLockStatus('locked');
    }
  }, [unlockCountdown, lockStatus]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const recognizeFace = async () => {
    setIsRecognizing(true);
    
    setTimeout(() => {
      const astronautIds = Object.keys(astronautDatabase);
      const randomId = astronautIds[Math.floor(Math.random() * astronautIds.length)];
      setRecognizedAstronaut(astronautDatabase[randomId]);
      
      const initSelection: Record<string, number> = {};
      astronautDatabase[randomId].medications.forEach(med => {
        initSelection[med.id] = 0;
      });
      setSelectedMedications(initSelection);
      
      setIsRecognizing(false);
      stopCamera();
    }, 1500);
  };

  const updateMedicationQty = (medId: string, delta: number) => {
    if (!recognizedAstronaut) return;
    const med = recognizedAstronaut.medications.find(m => m.id === medId);
    if (!med) return;
    
    const currentQty = selectedMedications[medId] || 0;
    const newQty = Math.max(0, Math.min(currentQty + delta, med.dailyLimit - med.takenToday));
    
    setSelectedMedications(prev => ({
      ...prev,
      [medId]: newQty
    }));
  };

  const handleConfirmDispense = async () => {
    const totalSelected = Object.values(selectedMedications).reduce((sum, qty) => sum + qty, 0);
    
    if (totalSelected === 0) {
      alert('Please select at least one medication');
      return;
    }
    
    setShowConfirmation(true);
  };

  const handleFinalDispense = async () => {
    const success = await unlockCabinet();
    if (success) {
      setShowConfirmation(false);
      setCurrentView('unlocked');
    }
  };

  const handleCancel = () => {
    setRecognizedAstronaut(null);
    setSelectedMedications({});
    setShowConfirmation(false);
    setCurrentView('home');
  };

  const calculateResupply = () => {
    const daysUntilResupply = 180;
    const results: Record<string, any> = {};
    
    Object.entries(inventory).forEach(([medId, data]) => {
      const weeklyUsage = data.usage;
      const weeksUntilResupply = Math.ceil(daysUntilResupply / 7);
      const predicted = weeklyUsage * weeksUntilResupply;
      const safetyBuffer = Math.ceil(predicted * 0.3);
      const orderQty = Math.max(0, predicted + safetyBuffer - data.current);
      
      results[medId] = {
        ...data,
        orderQty,
        status: data.current < predicted ? 'critical' : data.current < (predicted * 1.5) ? 'low' : 'good'
      };
    });
    
    return results;
  };

  const renderHome = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="text-center py-8 px-6">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-2">Medical Supply Cabinet</h1>
          <p className="text-gray-400 mb-6">Secure access via facial recognition</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => { setCurrentView('dispense'); startCamera(); }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg"
            >
              👤 Access Medications
            </button>
            <button
              onClick={() => setCurrentView('inventory')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-lg"
            >
              📦 View Inventory
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">🕐 Recent Activity</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-400">No recent transactions</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="bg-gray-700 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-white font-semibold">{tx.astronaut}</p>
                      <p className="text-gray-400 text-sm">
                        {tx.medications.map(m => `${m.name} (${m.quantity})`).join(', ')}
                      </p>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDispense = () => {
    if (!recognizedAstronaut) {
      return (
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6">
            {!cameraActive ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📷</div>
                <h2 className="text-2xl font-bold text-white mb-2">Facial Recognition</h2>
                <p className="text-gray-400 mb-6">Position your face in the camera view</p>
              </div>
            ) : (
              <div>
                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl mb-4" />
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={recognizeFace}
                    disabled={isRecognizing}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold text-lg"
                  >
                    {isRecognizing ? '⏳ Recognizing...' : '👤 Recognize Face'}
                  </button>
                  
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (showConfirmation) {
      const selectedItems = Object.entries(selectedMedications)
        .filter(([_, qty]) => qty > 0)
        .map(([medId, qty]) => {
          const med = recognizedAstronaut.medications.find(m => m.id === medId)!;
          return { ...med, quantity: qty };
        });

      return (
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">⚠️ Confirm Medication Dispense</h2>
            
            <div className="bg-blue-900 p-4 rounded-lg mb-6">
              <p className="text-white font-semibold mb-2">{recognizedAstronaut.name}</p>
              <div className="space-y-2">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex justify-between text-white">
                    <span>{item.name} ({item.dosage})</span>
                    <span className="font-bold">× {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-yellow-900 border-2 border-yellow-500 rounded-lg p-4 mb-6">
              <p className="text-white text-sm">
                ⚠️ After confirmation, the cabinet will unlock for 30 seconds. Please retrieve your medications promptly.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleFinalDispense}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-lg"
              >
                🔓 Confirm & Unlock Cabinet
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold text-lg"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-500 p-3 rounded-full">
                <span className="text-2xl">✓</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{recognizedAstronaut.name}</h2>
                <p className="text-gray-400">{recognizedAstronaut.role}</p>
              </div>
              <button onClick={handleCancel} className="text-red-500 hover:text-red-400 text-2xl">
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">💊 Select Medications</h3>
            
            <div className="space-y-4 mb-6">
              {recognizedAstronaut.medications.map((med) => {
                const qty = selectedMedications[med.id] || 0;
                const remaining = med.dailyLimit - med.takenToday;
                const stockAvailable = inventory[med.id]?.current || 0;
                
                return (
                  <div key={med.id} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-white">{med.name}</h4>
                        <p className="text-gray-400 text-sm">Dosage: {med.dosage}</p>
                        <p className="text-gray-400 text-sm">Frequency: {med.frequency}</p>
                        <p className="text-gray-400 text-xs mt-1">{med.instructions}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Stock: {stockAvailable}</p>
                        <p className="text-sm text-gray-400">Taken today: {med.takenToday}/{med.dailyLimit}</p>
                        <p className="text-sm text-green-500">Available: {remaining}</p>
                      </div>
                    </div>
                    
                    {remaining > 0 ? (
                      <div className="flex items-center gap-4 bg-blue-900 p-3 rounded-lg">
                        <button
                          onClick={() => updateMedicationQty(med.id, -1)}
                          disabled={qty === 0}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-semibold"
                        >
                          −
                        </button>
                        
                        <div className="flex-1 text-center">
                          <p className="text-3xl font-bold text-white">{qty}</p>
                          <p className="text-gray-400 text-sm">Selected</p>
                        </div>
                        
                        <button
                          onClick={() => updateMedicationQty(med.id, 1)}
                          disabled={qty >= remaining}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <div className="bg-yellow-900 border-2 border-yellow-500 rounded-lg p-3 text-center">
                        <p className="text-white text-sm">Daily limit reached</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleConfirmDispense}
              disabled={Object.values(selectedMedications).reduce((sum, qty) => sum + qty, 0) === 0}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold text-lg"
            >
              ✓ Continue to Confirmation
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderUnlocked = () => (
    <div className="bg-gray-800 border-2 border-green-500 rounded-xl">
      <div className="text-center py-8 px-6">
        <div className="text-6xl mb-4">🔓</div>
        <h1 className="text-4xl font-bold text-white mb-4">CABINET UNLOCKED</h1>
        
        <div className="bg-green-900 rounded-xl p-6 mb-6">
          <p className="text-6xl font-bold text-white mb-2">{unlockCountdown}</p>
          <p className="text-green-200">seconds remaining</p>
        </div>
        
        <div className="bg-blue-900 rounded-lg p-4 mb-6">
          <p className="text-white font-semibold mb-2">Please retrieve:</p>
          {recognizedAstronaut && Object.entries(selectedMedications)
            .filter(([_, qty]) => qty > 0)
            .map(([medId, qty]) => {
              const med = recognizedAstronaut.medications.find(m => m.id === medId);
              return med ? (
                <p key={medId} className="text-gray-300">
                  {med.name} ({med.dosage}) × {qty}
                </p>
              ) : null;
            })}
        </div>
        
        <p className="text-yellow-200 text-sm">
          Cabinet will auto-lock when closed or timer expires
        </p>
      </div>
    </div>
  );

  const renderInventory = () => {
    const resupplyData = calculateResupply();
    const criticalItems = Object.entries(resupplyData).filter(([_, data]) => data.status === 'critical');
    const lowItems = Object.entries(resupplyData).filter(([_, data]) => data.status === 'low');
    
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">📦 Inventory & Resupply Prediction</h2>
              <button onClick={() => setCurrentView('home')} className="text-blue-500 hover:text-blue-400 text-2xl">
                ✕
              </button>
            </div>
            
            <div className="bg-blue-900 rounded-lg p-4 mb-6">
              <p className="text-white font-semibold">Next Resupply: 180 days (6 months)</p>
              <p className="text-gray-400 text-sm">Predictions based on current usage trends</p>
            </div>

            {criticalItems.length > 0 && (
              <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-bold text-red-500 mb-2">⚠️ Critical Stock Levels ({criticalItems.length})</h3>
                {criticalItems.map(([medId, data]) => (
                  <p key={medId} className="text-red-200 text-sm">
                    • {medId.replace('_', ' ').toUpperCase()}: {data.current} units remaining
                  </p>
                ))}
              </div>
            )}

            {lowItems.length > 0 && (
              <div className="bg-yellow-900 border-2 border-yellow-500 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-bold text-yellow-600 mb-2">⚠️ Low Stock Warnings ({lowItems.length})</h3>
                {lowItems.map(([medId, data]) => (
                  <p key={medId} className="text-yellow-200 text-sm">
                    • {medId.replace('_', ' ').toUpperCase()}: {data.current} units
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(resupplyData).map(([medId, data]) => (
            <div key={medId} className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="p-6">
                <div className="flex justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white capitalize">
                      {medId.replace('_', ' ')}
                    </h3>
                    <p className="text-gray-400 text-sm">Expires: {data.expiry}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    data.status === 'critical' ? 'bg-red-500 text-white' : 
                    data.status === 'low' ? 'bg-yellow-500 text-black' : 
                    'bg-green-500 text-white'
                  }`}>
                    {data.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-gray-400 text-sm">Current Stock</p>
                    <p className="text-2xl font-bold text-white">{data.current}</p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-gray-400 text-sm">Weekly Usage</p>
                    <p className="text-2xl font-bold text-white">{data.usage}</p>
                  </div>
                </div>
                
                <div className="bg-blue-900 rounded-lg p-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Predicted Need (6 months)</p>
                      <p className="text-xl font-bold text-white">{data.predicted} units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-500 text-sm">Order Quantity</p>
                      <p className="text-2xl font-bold text-green-500">{data.orderQty}</p>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((data.current / data.predicted) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 mb-6 rounded-xl border border-gray-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500 p-3 rounded-xl">
                  <span className="text-2xl">💊</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">NASA HUNCH Medical System</h1>
                  <p className="text-gray-400">Automated Inventory Management</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className={`px-4 py-2 rounded-lg ${
                  lockStatus === 'locked' ? 'bg-red-500' : 
                  lockStatus === 'unlocked' ? 'bg-green-500' : 
                  'bg-yellow-500'
                } text-white`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{lockStatus === 'locked' ? '🔒' : lockStatus === 'unlocked' ? '🔓' : '⚠️'}</span>
                    <span className="font-semibold">{lockStatus.toUpperCase()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{new Date().toLocaleDateString()}</p>
                  <p className="text-gray-400 text-sm">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {currentView === 'home' && renderHome()}
        {currentView === 'dispense' && renderDispense()}
        {currentView === 'unlocked' && renderUnlocked()}
        {currentView === 'inventory' && renderInventory()}
      </div>
    </div>
  );
};

export default App;