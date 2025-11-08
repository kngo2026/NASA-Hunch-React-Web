import React, { useState, useRef, useEffect } from 'react';
import { Camera, User, Pill, Lock, Unlock, Clock, AlertCircle, CheckCircle, XCircle, Plus, Minus, Package, TrendingUp, AlertTriangle } from 'lucide-react';

const NASAMedicalSystem = () => {
  // Navigation state
  const [currentView, setCurrentView] = useState('home'); // home, dispense, inventory, admin
  
  // Camera & Recognition
  const [cameraActive, setCameraActive] = useState(false);
  const [recognizedAstronaut, setRecognizedAstronaut] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  
  // Lock state
  const [lockStatus, setLockStatus] = useState('locked'); // locked, unlocked, error
  const [unlockCountdown, setUnlockCountdown] = useState(0);
  
  // Medication selection
  const [selectedMedications, setSelectedMedications] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Inventory
  const [inventory, setInventory] = useState({
    'ibuprofen': { current: 245, predicted: 180, usage: 12, expiry: '2026-03-15' },
    'antihistamine': { current: 30, predicted: 90, usage: 8, expiry: '2025-12-20' },
    'melatonin': { current: 15, predicted: 45, usage: 5, expiry: '2026-01-10' },
    'vitamin_d': { current: 180, predicted: 120, usage: 15, expiry: '2026-06-30' },
    'antibiotic': { current: 50, predicted: 20, usage: 2, expiry: '2025-11-15' }
  });
  
  // Transaction history
  const [transactions, setTransactions] = useState([]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Mock astronaut database
  const astronautDatabase = {
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

  // ESP32 Lock Integration
  const ESP32_IP = 'http://192.168.1.50'; // Configure this to your ESP32 IP

  const checkLockStatus = async () => {
    try {
      const response = await fetch(`${ESP32_IP}/status`);
      const data = await response.json();
      setLockStatus(data.lock);
    } catch (error) {
      console.error('Lock status check failed:', error);
    }
  };

  const unlockCabinet = async () => {
    try {
      const response = await fetch(`${ESP32_IP}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid_session_token', // In production, use real JWT
          astronaut_id: recognizedAstronaut.id,
          medications: selectedMedications,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setLockStatus('unlocked');
        setUnlockCountdown(30);
        
        // Log transaction
        logTransaction();
        
        // Update inventory
        updateInventory();
        
        return true;
      }
    } catch (error) {
      console.error('Unlock failed:', error);
      setLockStatus('error');
      alert('Lock system error. Contact medical officer or use emergency override.');
    }
    return false;
  };

  const logTransaction = () => {
    const transaction = {
      id: Date.now(),
      astronaut: recognizedAstronaut.name,
      astronautId: recognizedAstronaut.id,
      medications: Object.entries(selectedMedications)
        .filter(([_, qty]) => qty > 0)
        .map(([medId, qty]) => {
          const med = recognizedAstronaut.medications.find(m => m.id === medId);
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

  // Countdown timer
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

  // Camera functions
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
    
    // Simulate recognition
    setTimeout(() => {
      const astronautIds = Object.keys(astronautDatabase);
      const randomId = astronautIds[Math.floor(Math.random() * astronautIds.length)];
      setRecognizedAstronaut(astronautDatabase[randomId]);
      
      // Initialize selection
      const initSelection = {};
      astronautDatabase[randomId].medications.forEach(med => {
        initSelection[med.id] = 0;
      });
      setSelectedMedications(initSelection);
      
      setIsRecognizing(false);
      stopCamera();
    }, 1500);
  };

  const updateMedicationQty = (medId, delta) => {
    const med = recognizedAstronaut.medications.find(m => m.id === medId);
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

  // Calculate resupply needs
  const calculateResupply = () => {
    const daysUntilResupply = 180;
    const results = {};
    
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

  // Views
  const renderHome = () => (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
        <Lock className="w-20 h-20 text-blue-300 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-white mb-2">Medical Supply Cabinet</h2>
        <p className="text-blue-200 mb-6">Secure access via facial recognition</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => { setCurrentView('dispense'); startCamera(); }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <User className="w-6 h-6" />
            Access Medications
          </button>
          <button
            onClick={() => setCurrentView('inventory')}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <Package className="w-6 h-6" />
            View Inventory
          </button>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Recent Activity
        </h3>
        {transactions.length === 0 ? (
          <p className="text-blue-200">No recent transactions</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="bg-white/5 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-semibold">{tx.astronaut}</p>
                    <p className="text-blue-200 text-sm">
                      {tx.medications.map(m => `${m.name} (${m.quantity})`).join(', ')}
                    </p>
                  </div>
                  <p className="text-blue-300 text-sm">
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDispense = () => {
    if (!recognizedAstronaut) {
      return (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          {!cameraActive ? (
            <div className="text-center py-20">
              <Camera className="w-20 h-20 text-blue-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Facial Recognition</h2>
              <p className="text-blue-200 mb-6">Position your face in the camera view</p>
            </div>
          ) : (
            <div>
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl mb-4" />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={recognizeFace}
                  disabled={isRecognizing}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2"
                >
                  {isRecognizing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Recognizing...
                    </>
                  ) : (
                    <>
                      <User className="w-5 h-5" />
                      Recognize Face
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleCancel}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (showConfirmation) {
      const selectedItems = Object.entries(selectedMedications)
        .filter(([_, qty]) => qty > 0)
        .map(([medId, qty]) => {
          const med = recognizedAstronaut.medications.find(m => m.id === medId);
          return { ...med, quantity: qty };
        });

      return (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
            Confirm Medication Dispense
          </h2>
          
          <div className="bg-blue-500/20 p-4 rounded-xl mb-6">
            <p className="text-white font-semibold mb-2">{recognizedAstronaut.name}</p>
            <div className="space-y-2">
              {selectedItems.map(item => (
                <div key={item.id} className="flex justify-between text-blue-200">
                  <span>{item.name} ({item.dosage})</span>
                  <span className="font-bold text-white">× {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-6">
            <p className="text-yellow-200 text-sm">
              ⚠️ After confirmation, the cabinet will unlock for 30 seconds. Please retrieve your medications promptly.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleFinalDispense}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Unlock className="w-6 h-6" />
              Confirm & Unlock Cabinet
            </button>
            <button
              onClick={() => setShowConfirmation(false)}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 rounded-xl transition-all"
            >
              Back
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-green-500 p-3 rounded-full">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white">{recognizedAstronaut.name}</h3>
              <p className="text-blue-200">{recognizedAstronaut.role}</p>
            </div>
            <button
              onClick={handleCancel}
              className="text-red-400 hover:text-red-300"
            >
              <XCircle className="w-8 h-8" />
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Pill className="w-6 h-6" />
            Select Medications
          </h3>
          
          <div className="space-y-4 mb-6">
            {recognizedAstronaut.medications.map((med) => {
              const qty = selectedMedications[med.id] || 0;
              const remaining = med.dailyLimit - med.takenToday;
              const stockAvailable = inventory[med.id]?.current || 0;
              
              return (
                <div key={med.id} className="bg-white/5 border border-white/20 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white">{med.name}</h4>
                      <p className="text-blue-200 text-sm">Dosage: {med.dosage}</p>
                      <p className="text-blue-200 text-sm">Frequency: {med.frequency}</p>
                      <p className="text-blue-300 text-xs mt-1">{med.instructions}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-300">Stock: {stockAvailable}</p>
                      <p className="text-sm text-blue-300">Taken today: {med.takenToday}/{med.dailyLimit}</p>
                      <p className="text-sm text-green-300">Available: {remaining}</p>
                    </div>
                  </div>
                  
                  {remaining > 0 ? (
                    <div className="flex items-center gap-4 bg-blue-500/20 p-3 rounded-lg">
                      <button
                        onClick={() => updateMedicationQty(med.id, -1)}
                        disabled={qty === 0}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white p-2 rounded-lg transition-all"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      
                      <div className="flex-1 text-center">
                        <p className="text-3xl font-bold text-white">{qty}</p>
                        <p className="text-blue-200 text-sm">Selected</p>
                      </div>
                      
                      <button
                        onClick={() => updateMedicationQty(med.id, 1)}
                        disabled={qty >= remaining}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white p-2 rounded-lg transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
                      <p className="text-yellow-200 text-sm">Daily limit reached</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleConfirmDispense}
            disabled={Object.values(selectedMedications).reduce((sum, qty) => sum + qty, 0) === 0}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-6 h-6" />
            Continue to Confirmation
          </button>
        </div>
      </div>
    );
  };

  const renderUnlocked = () => (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-green-500/50 text-center">
      <Unlock className="w-24 h-24 text-green-400 mx-auto mb-4 animate-pulse" />
      <h2 className="text-4xl font-bold text-white mb-4">CABINET UNLOCKED</h2>
      
      <div className="bg-green-500/20 rounded-2xl p-6 mb-6">
        <p className="text-6xl font-bold text-white mb-2">{unlockCountdown}</p>
        <p className="text-green-200">seconds remaining</p>
      </div>
      
      <div className="bg-blue-500/20 rounded-xl p-4 mb-6">
        <p className="text-white font-semibold mb-2">Please retrieve:</p>
        {Object.entries(selectedMedications)
          .filter(([_, qty]) => qty > 0)
          .map(([medId, qty]) => {
            const med = recognizedAstronaut.medications.find(m => m.id === medId);
            return (
              <p key={medId} className="text-blue-200">
                {med.name} ({med.dosage}) × {qty}
              </p>
            );
          })}
      </div>
      
      <p className="text-yellow-200 text-sm">Cabinet will auto-lock when closed or timer expires</p>
    </div>
  );

  const renderInventory = () => {
    const resupplyData = calculateResupply();
    const criticalItems = Object.entries(resupplyData).filter(([_, data]) => data.status === 'critical');
    const lowItems = Object.entries(resupplyData).filter(([_, data]) => data.status === 'low');
    
    return (
      <div className="space-y-6">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-8 h-8" />
              Inventory & Resupply Prediction
            </h2>
            <button
              onClick={() => setCurrentView('home')}
              className="text-blue-300 hover:text-blue-200"
            >
              <XCircle className="w-8 h-8" />
            </button>
          </div>
          
          <div className="bg-blue-500/20 rounded-xl p-4 mb-6">
            <p className="text-white font-semibold">Next Resupply: 180 days (6 months)</p>
            <p className="text-blue-200 text-sm">Predictions based on current usage trends</p>
          </div>

          {criticalItems.length > 0 && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
              <h3 className="text-red-200 font-bold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Critical Stock Levels ({criticalItems.length})
              </h3>
              {criticalItems.map(([medId, data]) => (
                <p key={medId} className="text-red-200 text-sm">
                  • {medId.replace('_', ' ').toUpperCase()}: {data.current} units remaining
                </p>
              ))}
            </div>
          )}

          {lowItems.length > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-4">
              <h3 className="text-yellow-200 font-bold mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Low Stock Warnings ({lowItems.length})
              </h3>
              {lowItems.map(([medId, data]) => (
                <p key={medId} className="text-yellow-200 text-sm">
                  • {medId.replace('_', ' ').toUpperCase()}: {data.current} units
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {Object.entries(resupplyData).map(([medId, data]) => (
            <div key={medId} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white capitalize">
                    {medId.replace('_', ' ')}
                  </h3>
                  <p className="text-blue-200 text-sm">Expires: {data.expiry}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  data.status === 'critical' ? 'bg-red-500/30 text-red-200' :
                  data.status === 'low' ? 'bg-yellow-500/30 text-yellow-200' :
                  'bg-green-500/30 text-green-200'
                }`}>
                  {data.status.toUpperCase()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="bg-white/5 p-3 rounded-lg">
                  <p className="text-blue-300 text-sm">Current Stock</p>
                  <p className="text-2xl font-bold text-white">{data.current}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg">
                  <p className="text-blue-300 text-sm">Weekly Usage</p>
                  <p className="text-2xl font-bold text-white">{data.usage}</p>
                </div>
              </div>
              
              <div className="bg-blue-500/20 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-blue-200 text-sm">Predicted Need (6 months)</p>
                    <p className="text-xl font-bold text-white">{data.predicted} units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-200 text-sm">Order Quantity</p>
                    <p className="text-2xl font-bold text-green-400">{data.orderQty}</p>
                  </div>
                </div>
                <div className="mt-2 bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((data.current / data.predicted) * 100, 100)}%` }}
                  />
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
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 p-3 rounded-xl">
                <Pill className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">NASA Hunch Medical System</h1>
                <p className="text-blue-200">Automated Inventory Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                lockStatus === 'locked' ? 'bg-red-500/20 border border-red-500/50' :
                lockStatus === 'unlocked' ? 'bg-green-500/20 border border-green-500/50' :
                'bg-yellow-500/20 border border-yellow-500/50'
              }`}>
                {lockStatus === 'locked' ? (
                  <>
                    <Lock className="w-5 h-5 text-red-300" />
                    <span className="text-red-200 font-semibold">LOCKED</span>
                  </>
                ) : lockStatus === 'unlocked' ? (
                  <>
                    <Unlock className="w-5 h-5 text-green-300" />
                    <span className="text-green-200 font-semibold">UNLOCKED</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-300" />
                    <span className="text-yellow-200 font-semibold">ERROR</span>
                  </>
                )}
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{new Date().toLocaleDateString()}</p>
                <p className="text-blue-200 text-sm">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {currentView === 'home' && renderHome()}
        {currentView === 'dispense' && renderDispense()}
        {currentView === 'unlocked' && renderUnlocked()}
        {currentView === 'inventory' && renderInventory()}
      </div>
    </div>
  );
};

export default NASAMedicalSystem;