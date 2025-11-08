import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  Spacer,
  Badge,
  Grid,
  Input,
} from "@chakra-ui/react";

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
  // Navigation state
  const [currentView, setCurrentView] = useState<'home' | 'dispense' | 'inventory' | 'unlocked'>('home');
  
  // Camera & Recognition
  const [cameraActive, setCameraActive] = useState(false);
  const [recognizedAstronaut, setRecognizedAstronaut] = useState<Astronaut | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  
  // Lock state
  const [lockStatus, setLockStatus] = useState<'locked' | 'unlocked' | 'error'>('locked');
  const [unlockCountdown, setUnlockCountdown] = useState(0);
  
  // Medication selection
  const [selectedMedications, setSelectedMedications] = useState<Record<string, number>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Inventory
  const [inventory, setInventory] = useState<Record<string, InventoryData>>({
    'ibuprofen': { current: 245, predicted: 180, usage: 12, expiry: '2026-03-15' },
    'antihistamine': { current: 30, predicted: 90, usage: 8, expiry: '2025-12-20' },
    'melatonin': { current: 15, predicted: 45, usage: 5, expiry: '2026-01-10' },
    'vitamin_d': { current: 180, predicted: 120, usage: 15, expiry: '2026-06-30' },
    'antibiotic': { current: 50, predicted: 20, usage: 2, expiry: '2025-11-15' }
  });
  
  // Transaction history
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mock astronaut database
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
    <VStack gap={6}>
      <Box bg="gray.800" w="100%" borderRadius="xl" border="1px solid" borderColor="gray.700">
        <Box textAlign="center" py={8} px={6}>
          <Text fontSize="6xl" mb={4}>🔒</Text>
          <Heading size="xl" color="white" mb={2}>Medical Supply Cabinet</Heading>
          <Text color="gray.400" mb={6}>
            Secure access via facial recognition
          </Text>
          <HStack gap={4} justify="center">
            <Button
              onClick={() => { setCurrentView('dispense'); startCamera(); }}
              colorScheme="blue"
              size="lg"
            >
              👤 Access Medications
            </Button>
            <Button
              onClick={() => setCurrentView('inventory')}
              colorScheme="green"
              size="lg"
            >
              📦 View Inventory
            </Button>
          </HStack>
        </Box>
      </Box>

      <Box bg="gray.800" w="100%" borderRadius="xl" border="1px solid" borderColor="gray.700">
        <Box p={6}>
          <Heading size="md" color="white" mb={4}>🕐 Recent Activity</Heading>
          {transactions.length === 0 ? (
            <Text color="gray.400">No recent transactions</Text>
          ) : (
            <VStack gap={2} align="stretch">
              {transactions.slice(0, 5).map(tx => (
                <Box key={tx.id} bg="gray.700" p={3} borderRadius="md">
                  <Flex justify="space-between">
                    <Box>
                      <Text color="white" fontWeight="semibold">{tx.astronaut}</Text>
                      <Text color="gray.400" fontSize="sm">
                        {tx.medications.map(m => `${m.name} (${m.quantity})`).join(', ')}
                      </Text>
                    </Box>
                    <Text color="gray.400" fontSize="sm">
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </Text>
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      </Box>
    </VStack>
  );

  const renderDispense = () => {
    if (!recognizedAstronaut) {
      return (
        <Box bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700">
          <Box p={6}>
            {!cameraActive ? (
              <Box textAlign="center" py={20}>
                <Text fontSize="6xl" mb={4}>📷</Text>
                <Heading size="lg" color="white" mb={2}>Facial Recognition</Heading>
                <Text color="gray.400" mb={6}>
                  Position your face in the camera view
                </Text>
              </Box>
            ) : (
              <Box>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: '12px', marginBottom: '16px' }} />
                
                <HStack gap={3} justify="center">
                  <Button
                    onClick={recognizeFace}
                    disabled={isRecognizing}
                    colorScheme="green"
                    size="lg"
                  >
                    {isRecognizing ? '⏳ Recognizing...' : '👤 Recognize Face'}
                  </Button>
                  
                  <Button
                    onClick={handleCancel}
                    colorScheme="red"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </HStack>
              </Box>
            )}
          </Box>
        </Box>
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
        <Box bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700">
          <Box p={6}>
            <Heading size="lg" color="white" mb={4}>⚠️ Confirm Medication Dispense</Heading>
            
            <Box bg="blue.900" p={4} borderRadius="md" mb={6}>
              <Text color="white" fontWeight="semibold" mb={2}>{recognizedAstronaut.name}</Text>
              <VStack gap={2} align="stretch">
                {selectedItems.map(item => (
                  <Flex key={item.id} justify="space-between" color="white">
                    <Text>{item.name} ({item.dosage})</Text>
                    <Text fontWeight="bold">× {item.quantity}</Text>
                  </Flex>
                ))}
              </VStack>
            </Box>

            <Box bg="yellow.900" border="2px solid" borderColor="yellow.500" borderRadius="md" p={4} mb={6}>
              <Text color="white" fontSize="sm">
                ⚠️ After confirmation, the cabinet will unlock for 30 seconds. Please retrieve your medications promptly.
              </Text>
            </Box>

            <HStack gap={3}>
              <Button
                onClick={handleFinalDispense}
                flex={1}
                colorScheme="green"
                size="lg"
              >
                🔓 Confirm & Unlock Cabinet
              </Button>
              <Button
                onClick={() => setShowConfirmation(false)}
                flex={1}
                colorScheme="gray"
                size="lg"
              >
                Back
              </Button>
            </HStack>
          </Box>
        </Box>
      );
    }

    return (
      <VStack gap={6}>
        <Box bg="gray.800" w="100%" borderRadius="xl" border="1px solid" borderColor="gray.700">
          <Box p={6}>
            <Flex align="center" gap={4}>
              <Box bg="green.500" p={3} borderRadius="full">
                <Text fontSize="2xl">✓</Text>
              </Box>
              <Box flex={1}>
                <Heading size="lg" color="white">{recognizedAstronaut.name}</Heading>
                <Text color="gray.400">{recognizedAstronaut.role}</Text>
              </Box>
              <Button onClick={handleCancel} colorScheme="red" variant="ghost">
                ✕
              </Button>
            </Flex>
          </Box>
        </Box>

        <Box bg="gray.800" w="100%" borderRadius="xl" border="1px solid" borderColor="gray.700">
          <Box p={6}>
            <Heading size="md" color="white" mb={4}>💊 Select Medications</Heading>
            
            <VStack gap={4} mb={6}>
              {recognizedAstronaut.medications.map((med) => {
                const qty = selectedMedications[med.id] || 0;
                const remaining = med.dailyLimit - med.takenToday;
                const stockAvailable = inventory[med.id]?.current || 0;
                
                return (
                  <Box key={med.id} bg="gray.700" border="1px solid" borderColor="gray.600" borderRadius="md" p={4} w="100%">
                    <Flex justify="space-between" mb={3}>
                      <Box flex={1}>
                        <Heading size="sm" color="white">{med.name}</Heading>
                        <Text color="gray.400" fontSize="sm">Dosage: {med.dosage}</Text>
                        <Text color="gray.400" fontSize="sm">Frequency: {med.frequency}</Text>
                        <Text color="gray.400" fontSize="xs" mt={1}>{med.instructions}</Text>
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="sm" color="gray.400">Stock: {stockAvailable}</Text>
                        <Text fontSize="sm" color="gray.400">Taken today: {med.takenToday}/{med.dailyLimit}</Text>
                        <Text fontSize="sm" color="green.500">Available: {remaining}</Text>
                      </Box>
                    </Flex>
                    
                    {remaining > 0 ? (
                      <Flex align="center" gap={4} bg="blue.900" p={3} borderRadius="md">
                        <Button
                          onClick={() => updateMedicationQty(med.id, -1)}
                          disabled={qty === 0}
                          colorScheme="red"
                          size="sm"
                        >
                          −
                        </Button>
                        
                        <Box flex={1} textAlign="center">
                          <Text fontSize="3xl" fontWeight="bold" color="white">{qty}</Text>
                          <Text color="gray.400" fontSize="sm">Selected</Text>
                        </Box>
                        
                        <Button
                          onClick={() => updateMedicationQty(med.id, 1)}
                          disabled={qty >= remaining}
                          colorScheme="green"
                          size="sm"
                        >
                          +
                        </Button>
                      </Flex>
                    ) : (
                      <Box bg="yellow.900" border="2px solid" borderColor="yellow.500" borderRadius="md" p={3} textAlign="center">
                        <Text color="white" fontSize="sm">Daily limit reached</Text>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </VStack>

            <Button
              onClick={handleConfirmDispense}
              disabled={Object.values(selectedMedications).reduce((sum, qty) => sum + qty, 0) === 0}
              w="100%"
              colorScheme="blue"
              size="lg"
            >
              ✓ Continue to Confirmation
            </Button>
          </Box>
        </Box>
      </VStack>
    );
  };

  const renderUnlocked = () => (
    <Box bg="gray.800" borderColor="green.500" borderWidth="2px" borderRadius="xl">
      <Box textAlign="center" py={8} px={6}>
        <Text fontSize="6xl" mb={4}>🔓</Text>
        <Heading size="2xl" color="white" mb={4}>CABINET UNLOCKED</Heading>
        
        <Box bg="green.900" borderRadius="xl" p={6} mb={6}>
          <Text fontSize="6xl" fontWeight="bold" color="white" mb={2}>{unlockCountdown}</Text>
          <Text color="green.200">seconds remaining</Text>
        </Box>
        
        <Box bg="blue.900" borderRadius="md" p={4} mb={6}>
          <Text color="white" fontWeight="semibold" mb={2}>Please retrieve:</Text>
          {recognizedAstronaut && Object.entries(selectedMedications)
            .filter(([_, qty]) => qty > 0)
            .map(([medId, qty]) => {
              const med = recognizedAstronaut.medications.find(m => m.id === medId);
              return med ? (
                <Text key={medId} color="gray.300">
                  {med.name} ({med.dosage}) × {qty}
                </Text>
              ) : null;
            })}
        </Box>
        
        <Text color="yellow.200" fontSize="sm">
          Cabinet will auto-lock when closed or timer expires
        </Text>
      </Box>
    </Box>
  );

  const renderInventory = () => {
    const resupplyData = calculateResupply();
    const criticalItems = Object.entries(resupplyData).filter(([_, data]) => data.status === 'critical');
    const lowItems = Object.entries(resupplyData).filter(([_, data]) => data.status === 'low');
    
    return (
      <VStack gap={6}>
        <Box bg="gray.800" w="100%" borderRadius="xl" border="1px solid" borderColor="gray.700">
          <Box p={6}>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="lg" color="white">📦 Inventory & Resupply Prediction</Heading>
              <Button onClick={() => setCurrentView('home')} colorScheme="blue" variant="ghost">
                ✕
              </Button>
            </Flex>
            
            <Box bg="blue.900" borderRadius="md" p={4} mb={6}>
              <Text color="white" fontWeight="semibold">Next Resupply: 180 days (6 months)</Text>
              <Text color="gray.400" fontSize="sm">
                Predictions based on current usage trends
              </Text>
            </Box>

            {criticalItems.length > 0 && (
              <Box bg="red.900" border="2px solid" borderColor="red.500" borderRadius="md" p={4} mb={4}>
                <Heading size="sm" color="red.500" mb={2}>⚠️ Critical Stock Levels ({criticalItems.length})</Heading>
                {criticalItems.map(([medId, data]) => (
                  <Text key={medId} color="red.200" fontSize="sm">
                    • {medId.replace('_', ' ').toUpperCase()}: {data.current} units remaining
                  </Text>
                ))}
              </Box>
            )}

            {lowItems.length > 0 && (
              <Box bg="yellow.900" border="2px solid" borderColor="yellow.500" borderRadius="md" p={4} mb={4}>
                <Heading size="sm" color="yellow.600" mb={2}>⚠️ Low Stock Warnings ({lowItems.length})</Heading>
                {lowItems.map(([medId, data]) => (
                  <Text key={medId} color="yellow.200" fontSize="sm">
                    • {medId.replace('_', ' ').toUpperCase()}: {data.current} units
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        <VStack gap={4} w="100%">
          {Object.entries(resupplyData).map(([medId, data]) => (
            <Box key={medId} bg="gray.800" w="100%" borderRadius="xl" border="1px solid" borderColor="gray.700">
              <Box p={6}>
                <Flex justify="space-between" mb={3}>
                  <Box>
                    <Heading size="md" color="white" textTransform="capitalize">
                      {medId.replace('_', ' ')}
                    </Heading>
                    <Text color="gray.400" fontSize="sm">
                      Expires: {data.expiry}
                    </Text>
                  </Box>
                  <Badge colorScheme={data.status === 'critical' ? 'red' : data.status === 'low' ? 'yellow' : 'green'}>
                    {data.status.toUpperCase()}
                  </Badge>
                </Flex>
                
                <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={3}>
                  <Box bg="gray.700" p={3} borderRadius="md">
                    <Text color="gray.400" fontSize="sm">Current Stock</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="white">{data.current}</Text>
                  </Box>
                  <Box bg="gray.700" p={3} borderRadius="md">
                    <Text color="gray.400" fontSize="sm">Weekly Usage</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="white">{data.usage}</Text>
                  </Box>
                </Grid>
                
                <Box bg="blue.900" borderRadius="md" p={3}>
                  <Flex justify="space-between">
                    <Box>
                      <Text color="gray.400" fontSize="sm">
                        Predicted Need (6 months)
                      </Text>
                      <Text fontSize="xl" fontWeight="bold" color="white">{data.predicted} units</Text>
                    </Box>
                    <Box textAlign="right">
                      <Text color="green.500" fontSize="sm">Order Quantity</Text>
                      <Text fontSize="2xl" fontWeight="bold" color="green.500">{data.orderQty}</Text>
                    </Box>
                  </Flex>
                  <Box mt={2} bg="gray.600" borderRadius="full" h="8px">
                    <Box 
                      bg="blue.500" 
                      h="8px" 
                      borderRadius="full"
                      w={`${Math.min((data.current / data.predicted) * 100, 100)}%`}
                      transition="width 0.3s"
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          ))}
        </VStack>
      </VStack>
    );
  };

  return (
    <Box bg="linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)" minH="100vh" p={4}>
      <Box maxW="4xl" mx="auto">
        {/* Header */}
        <Box bg="gray.800" mb={6} borderRadius="xl" border="1px solid" borderColor="gray.700">
          <Box p={6}>
            <Flex align="center" justify="space-between">
              <Flex align="center" gap={4}>
                <Box bg="blue.500" p={3} borderRadius="xl">
                  <Text fontSize="2xl">💊</Text>
                </Box>
                <Box>
                  <Heading size="lg" color="white">NASA HUNCH Medical System</Heading>
                  <Text color="gray.400">
                    Automated Inventory Management
                  </Text>
                </Box>
              </Flex>
              <HStack gap={4}>
                <Box
                  px={4}
                  py={2}
                  borderRadius="md"
                  bg={lockStatus === 'locked' ? 'red.500' : lockStatus === 'unlocked' ? 'green.500' : 'yellow.500'}
                  color="white"
                >
                  <HStack>
                    <Text fontSize="lg">{lockStatus === 'locked' ? '🔒' : lockStatus === 'unlocked' ? '🔓' : '⚠️'}</Text>
                    <Text fontWeight="semibold">{lockStatus.toUpperCase()}</Text>
                  </HStack>
                </Box>
                <Box textAlign="right">
                  <Text color="white" fontWeight="semibold">{new Date().toLocaleDateString()}</Text>
                  <Text color="gray.400" fontSize="sm">
                    {new Date().toLocaleTimeString()}
                  </Text>
                </Box>
              </HStack>
            </Flex>
          </Box>
        </Box>

        {/* Main Content */}
        {currentView === 'home' && renderHome()}
        {currentView === 'dispense' && renderDispense()}
        {currentView === 'unlocked' && renderUnlocked()}
        {currentView === 'inventory' && renderInventory()}
      </Box>
    </Box>
  );
};

export default App;