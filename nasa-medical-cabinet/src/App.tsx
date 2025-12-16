import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';

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
  const webcamRef = useRef<Webcam>(null);

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

  const startCamera = () => {
    setCameraActive(true);
  };

  const stopCamera = () => {
    setCameraActive(false);
  };

  const recognizeFace = async () => {
    setIsRecognizing(true);
    
    // Capture image from webcam
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      console.log('Captured image for facial recognition:', imageSrc);
      // In a real implementation, you would send imageSrc to your Python backend
      // for actual facial recognition processing
    }
    
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
    stopCamera();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Medical Supply Cabinet</h1>
          <p style={{ color: '#9ca3af', marginBottom: '24px' }}>Secure access via facial recognition</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCurrentView('dispense')}
              style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer' }}
            >
              👤 Access Medications
            </button>
            <button
              onClick={() => setCurrentView('inventory')}
              style={{ padding: '12px 24px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer' }}
            >
              📦 View Inventory
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>🕐 Recent Activity</h2>
          {transactions.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No recent transactions</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} style={{ background: '#374151', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <p style={{ color: 'white', fontWeight: '600' }}>{tx.astronaut}</p>
                      <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                        {tx.medications.map(m => `${m.name} (${m.quantity})`).join(', ')}
                      </p>
                    </div>
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>
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
        <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
          <div style={{ padding: '24px' }}>
            {!cameraActive ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📷</div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                  Facial Recognition
                </h2>
                <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
                  Position your face in the camera view
                </p>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={startCamera}
                    style={{ padding: '12px 24px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    📷 Start Camera
                  </button>
                  
                  <button
                    onClick={handleCancel}
                    style={{ padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Camera Interface with Overlays */}
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  {/* React Webcam Component */}
                  <div style={{ borderRadius: '16px', overflow: 'hidden', backgroundColor: '#000' }}>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                      }}
                      style={{
                        width: '100%',
                        maxHeight: '500px',
                        display: 'block',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  
                  {/* Face Detection Frame Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '280px',
                    height: '350px',
                    border: '3px solid #22c55e',
                    borderRadius: '16px',
                    boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.3), 0 0 20px rgba(34, 197, 94, 0.4)',
                    pointerEvents: 'none'
                  }}>
                    {/* Corner Brackets */}
                    <div style={{ position: 'absolute', top: '-3px', left: '-3px', width: '40px', height: '40px', borderTop: '5px solid #22c55e', borderLeft: '5px solid #22c55e', borderRadius: '16px 0 0 0' }} />
                    <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '40px', height: '40px', borderTop: '5px solid #22c55e', borderRight: '5px solid #22c55e', borderRadius: '0 16px 0 0' }} />
                    <div style={{ position: 'absolute', bottom: '-3px', left: '-3px', width: '40px', height: '40px', borderBottom: '5px solid #22c55e', borderLeft: '5px solid #22c55e', borderRadius: '0 0 0 16px' }} />
                    <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '40px', height: '40px', borderBottom: '5px solid #22c55e', borderRight: '5px solid #22c55e', borderRadius: '0 0 16px 0' }} />
                  </div>
                  
                  {/* Status Overlays */}
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    right: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    pointerEvents: 'none'
                  }}>
                    {/* Recording Indicator */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(10px)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        animation: 'pulse 2s infinite'
                      }} />
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>LIVE</span>
                    </div>
                    
                    {/* Scanning Status */}
                    {isRecognizing && (
                      <div style={{
                        background: 'rgba(34, 197, 94, 0.9)',
                        backdropFilter: 'blur(10px)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        🔍 SCANNING...
                      </div>
                    )}
                  </div>
                  
                  {/* Instructions Overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    pointerEvents: 'none'
                  }}>
                    <p style={{ color: 'white', fontSize: '14px', fontWeight: '600', margin: 0, textAlign: 'center' }}>
                      Position your face within the frame
                    </p>
                  </div>
                </div>
                
                {/* Control Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={recognizeFace}
                    disabled={isRecognizing}
                    style={{ 
                      padding: '12px 24px', 
                      background: isRecognizing ? '#4b5563' : '#16a34a', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      cursor: isRecognizing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {isRecognizing ? '⏳ Recognizing...' : '👤 Recognize Face'}
                  </button>
                  
                  <button
                    onClick={handleCancel}
                    style={{ 
                      padding: '12px 24px', 
                      background: '#dc2626', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    ✕ Cancel
                  </button>
                </div>

                {/* Add pulse animation */}
                <style>{`
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                  }
                `}</style>
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
        <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>⚠️ Confirm Medication Dispense</h2>
            
            <div style={{ background: '#1e3a8a', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <p style={{ color: 'white', fontWeight: '600', marginBottom: '8px' }}>{recognizedAstronaut.name}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                    <span>{item.name} ({item.dosage})</span>
                    <span style={{ fontWeight: 'bold' }}>× {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#713f12', border: '2px solid #eab308', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: 'white', fontSize: '14px' }}>
                ⚠️ After confirmation, the cabinet will unlock for 30 seconds. Please retrieve your medications promptly.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleFinalDispense}
                style={{ flex: '1', minWidth: '200px', padding: '12px 24px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer' }}
              >
                🔓 Confirm & Unlock Cabinet
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                style={{ flex: '1', minWidth: '200px', padding: '12px 24px', background: '#4b5563', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer' }}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: '#22c55e', padding: '12px', borderRadius: '50%' }}>
                <span style={{ fontSize: '24px' }}>✓</span>
              </div>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{recognizedAstronaut.name}</h2>
                <p style={{ color: '#9ca3af' }}>{recognizedAstronaut.role}</p>
              </div>
              <button onClick={handleCancel} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '24px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
          <div style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>💊 Select Medications</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {recognizedAstronaut.medications.map((med) => {
                const qty = selectedMedications[med.id] || 0;
                const remaining = med.dailyLimit - med.takenToday;
                const stockAvailable = inventory[med.id]?.current || 0;
                
                return (
                  <div key={med.id} style={{ background: '#374151', border: '1px solid #4b5563', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>{med.name}</h4>
                        <p style={{ color: '#9ca3af', fontSize: '14px' }}>Dosage: {med.dosage}</p>
                        <p style={{ color: '#9ca3af', fontSize: '14px' }}>Frequency: {med.frequency}</p>
                        <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>{med.instructions}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '14px', color: '#9ca3af' }}>Stock: {stockAvailable}</p>
                        <p style={{ fontSize: '14px', color: '#9ca3af' }}>Taken today: {med.takenToday}/{med.dailyLimit}</p>
                        <p style={{ fontSize: '14px', color: '#22c55e' }}>Available: {remaining}</p>
                      </div>
                    </div>
                    
                    {remaining > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#1e3a8a', padding: '12px', borderRadius: '8px' }}>
                        <button
                          onClick={() => updateMedicationQty(med.id, -1)}
                          disabled={qty === 0}
                          style={{ padding: '8px 16px', background: qty === 0 ? '#4b5563' : '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: qty === 0 ? 'not-allowed' : 'pointer' }}
                        >
                          −
                        </button>
                        
                        <div style={{ flex: '1', textAlign: 'center' }}>
                          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{qty}</p>
                          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Selected</p>
                        </div>
                        
                        <button
                          onClick={() => updateMedicationQty(med.id, 1)}
                          disabled={qty >= remaining}
                          style={{ padding: '8px 16px', background: qty >= remaining ? '#4b5563' : '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: qty >= remaining ? 'not-allowed' : 'pointer' }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: '#713f12', border: '2px solid #eab308', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                        <p style={{ color: 'white', fontSize: '14px' }}>Daily limit reached</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleConfirmDispense}
              disabled={Object.values(selectedMedications).reduce((sum, qty) => sum + qty, 0) === 0}
              style={{
                padding: '16px 24px',
                background: Object.values(selectedMedications).reduce((sum, qty) => sum + qty, 0) === 0
                  ? '#4b5563'
                  : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: Object.values(selectedMedications).reduce((sum, qty) => sum + qty, 0) === 0
                  ? 'not-allowed'
                  : 'pointer',
                width: '100%'
              }}
            >
              🧾 Review & Dispense
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderUnlocked = () => (
    <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '72px', marginBottom: '16px' }}>🔓</div>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
          Cabinet Unlocked
        </h2>
        <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
          Please retrieve your medications
        </p>

        <div style={{
          background: '#16a34a',
          padding: '16px',
          borderRadius: '12px',
          display: 'inline-block',
          marginBottom: '24px'
        }}>
          <p style={{ color: 'white', fontSize: '20px', fontWeight: '700' }}>
            ⏱ {unlockCountdown}s remaining
          </p>
        </div>

        <button
          onClick={handleCancel}
          style={{
            padding: '12px 24px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Return Home
        </button>
      </div>
    </div>
  );

  const renderInventory = () => {
    const resupply = calculateResupply();

    return (
      <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
            📦 Inventory Status
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(resupply).map(([id, data]: any) => (
              <div
                key={id}
                style={{
                  background: '#374151',
                  borderRadius: '8px',
                  padding: '16px',
                  borderLeft: `6px solid ${
                    data.status === 'critical'
                      ? '#dc2626'
                      : data.status === 'low'
                      ? '#eab308'
                      : '#16a34a'
                  }`
                }}
              >
                <p style={{ color: 'white', fontWeight: '700', marginBottom: '4px' }}>
                  {id.replace('_', ' ').toUpperCase()}
                </p>
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                  Stock: {data.current} | Predicted Use: {data.predicted}
                </p>
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                  Suggested Order: {data.orderQty}
                </p>
                <p style={{ color: '#9ca3af', fontSize: '12px' }}>
                  Expiry: {data.expiry}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setCurrentView('home')}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ⬅ Back Home
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      width:'100vw',
      background:'#020617',
      margin: 0,
    }}>
      {currentView === 'home' && renderHome()}
      {currentView === 'dispense' && renderDispense()}
      {currentView === 'inventory' && renderInventory()}
      {currentView === 'unlocked' && renderUnlocked()}
    </div>
  );
};

export default App;