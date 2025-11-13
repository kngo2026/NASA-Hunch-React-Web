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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Medical Supply Cabinet</h1>
          <p style={{ color: '#9ca3af', marginBottom: '24px' }}>Secure access via facial recognition</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setCurrentView('dispense'); startCamera(); }}
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
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>📷 Facial Recognition</h2>
              <p style={{ color: '#9ca3af', marginBottom: '24px' }}>Position your face in the camera view</p>
            </div>
            
            <div>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ 
                  width: '100%', 
                  borderRadius: '16px', 
                  marginBottom: '16px',
                  background: '#000',
                  minHeight: '400px',
                  display: cameraActive ? 'block' : 'none'
                }} 
              />
              
              {!cameraActive && (
                <div style={{ 
                  background: '#000', 
                  borderRadius: '16px', 
                  padding: '80px 20px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>📷</div>
                  <p style={{ color: '#9ca3af' }}>Camera will activate when you click "Start Camera"</p>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    📷 Start Camera
                  </button>
                ) : (
                  <button
                    onClick={recognizeFace}
                    disabled={isRecognizing}
                    style={{ padding: '12px 24px', background: isRecognizing ? '#4b5563' : '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: isRecognizing ? 'not-allowed' : 'pointer' }}
                  >
                    {isRecognizing ? '⏳ Recognizing...' : '👤 Recognize Face'}
                  </button>
                )}
                
                <button
                  onClick={handleCancel}
                  style={{ padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
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
              style={{ width: '100%', padding: '12px 24px', background: Object.values(selectedMedications).reduce((sum, qty) => sum + qty, 0) === 0 ? '#4b5563' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: Object.values(selectedMedications).reduce((sum, qty) => sum + qty, 0) === 0 ? 'not-allowed' : 'pointer' }}
            >
              ✓ Continue to Confirmation
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderUnlocked = () => (
    <div style={{ background: '#1f2937', border: '2px solid #22c55e', borderRadius: '16px' }}>
      <div style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔓</div>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>CABINET UNLOCKED</h1>
        
        <div style={{ background: '#14532d', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ fontSize: '64px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>{unlockCountdown}</p>
          <p style={{ color: '#86efac' }}>seconds remaining</p>
        </div>
        
        <div style={{ background: '#1e3a8a', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: 'white', fontWeight: '600', marginBottom: '8px' }}>Please retrieve:</p>
          {recognizedAstronaut && Object.entries(selectedMedications)
            .filter(([_, qty]) => qty > 0)
            .map(([medId, qty]) => {
              const med = recognizedAstronaut.medications.find(m => m.id === medId);
              return med ? (
                <p key={medId} style={{ color: '#d1d5db' }}>
                  {med.name} ({med.dosage}) × {qty}
                </p>
              ) : null;
            })}
        </div>
        
        <p style={{ color: '#fef08a', fontSize: '14px' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>📦 Inventory & Resupply Prediction</h2>
              <button onClick={() => setCurrentView('home')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '24px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            
            <div style={{ background: '#1e3a8a', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: 'white', fontWeight: '600' }}>Next Resupply: 180 days (6 months)</p>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>Predictions based on current usage trends</p>
            </div>

            {criticalItems.length > 0 && (
              <div style={{ background: '#7f1d1d', border: '2px solid #ef4444', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px' }}>⚠️ Critical Stock Levels ({criticalItems.length})</h3>
                {criticalItems.map(([medId, data]) => (
                  <p key={medId} style={{ color: '#fca5a5', fontSize: '14px' }}>
                    • {medId.replace('_', ' ').toUpperCase()}: {data.current} units remaining
                  </p>
                ))}
              </div>
            )}

            {lowItems.length > 0 && (
              <div style={{ background: '#713f12', border: '2px solid #eab308', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ca8a04', marginBottom: '8px' }}>⚠️ Low Stock Warnings ({lowItems.length})</h3>
                {lowItems.map(([medId, data]) => (
                  <p key={medId} style={{ color: '#fef08a', fontSize: '14px' }}>
                    • {medId.replace('_', ' ').toUpperCase()}: {data.current} units
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(resupplyData).map(([medId, data]) => (
            <div key={medId} style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151' }}>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', textTransform: 'capitalize' }}>
                      {medId.replace('_', ' ')}
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>Expires: {data.expiry}</p>
                  </div>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '9999px', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    background: data.status === 'critical' ? '#ef4444' : data.status === 'low' ? '#eab308' : '#22c55e',
                    color: data.status === 'low' ? 'black' : 'white'
                  }}>
                    {data.status.toUpperCase()}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ background: '#374151', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>Current Stock</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{data.current}</p>
                  </div>
                  <div style={{ background: '#374151', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>Weekly Usage</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{data.usage}</p>
                  </div>
                </div>
                
                <div style={{ background: '#1e3a8a', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <p style={{ color: '#9ca3af', fontSize: '14px' }}>Predicted Need (6 months)</p>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{data.predicted} units</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: '#22c55e', fontSize: '14px' }}>Order Quantity</p>
                      <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>{data.orderQty}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', background: '#4b5563', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        background: '#3b82f6', 
                        height: '8px', 
                        borderRadius: '9999px',
                        width: `${Math.min((data.current / data.predicted) * 100, 100)}%`,
                        transition: 'width 0.3s'
                      }}
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
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)', 
      padding: '16px' 
    }}>
      <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: '#1f2937', marginBottom: '24px', borderRadius: '16px', border: '1px solid #374151' }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#3b82f6', padding: '12px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '24px' }}>💊</span>
                </div>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: 0 }}>NASA HUNCH Medical System</h1>
                  <p style={{ color: '#9ca3af', margin: 0 }}>Automated Inventory Management</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: lockStatus === 'locked' ? '#ef4444' : lockStatus === 'unlocked' ? '#22c55e' : '#eab308',
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{lockStatus === 'locked' ? '🔒' : lockStatus === 'unlocked' ? '🔓' : '⚠️'}</span>
                    <span style={{ fontWeight: '600' }}>{lockStatus.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'white', fontWeight: '600', margin: 0, fontSize: '14px' }}>{new Date().toLocaleDateString()}</p>
                  <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
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

export default App;