import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged,
    signOut
} from 'firebase/auth';
import {
    getFirestore, collection, onSnapshot, doc, getDoc, addDoc, setDoc,
    updateDoc, serverTimestamp, arrayUnion, query, where, orderBy, deleteDoc,
    setLogLevel,
    getDocs // Telah ditambahkan
} from 'firebase/firestore';
import { ChevronRight, ChevronDown, Coffee, Utensils, Zap, Clock, Leaf } from 'lucide-react';

// --- CONFIGURATION & FIREBASE INITIALIZATION ---
// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined'
    ? __initial_auth_token
    : null;

// Initialize Firebase services
let app;
let db;
let auth;

// MOCK USER DATA for Authentication Simulation
const MOCK_USERS_AUTH = [
    { role: 'Owner', name: 'Adi Owner', username: 'kofu.owner', token: 'Owner123' },
    { role: 'Finance', name: 'Rina Finance', username: 'kofu.finance', token: 'Finance123' },
    { role: 'Head Chef', name: 'Chef Budi', username: 'kofu.chef', token: 'Chef123' },
    { role: 'Barista', name: 'Kiki Barista', username: 'kofu.barista', token: 'Barista123' },
    { role: 'Kasir', name: 'Novi Kasir', username: 'kofu.kasir', token: 'Kasir123' }
];

// --- STATIC MENU DATA (Baru) ---
const KOFU_MENU = [
    {
        category: "Seasonal Menu",
        icon: Zap,
        items: [
            { name: "Kuotie Chicken Ricebowl", price: 54000 },
            { name: "Hoisin Chicken Ricebowl", price: 43500 },
            { name: "Spaghetti Napolitan", price: 50500 },
            { name: "Gochujang Meatball Pasta", price: 54000 },
            { name: "Spaghetti Lemon Chicken", price: 48000 },
            { name: "Soto Bandung", price: 56000 },
            { name: "Tiramisu Toast", price: 36500 },
            { name: "Mie Kari", price: 50500 },
            { name: "Ubi Mochi Matcha", price: 43000 },
        ]
    },
    {
        category: "Breakfast Menu",
        icon: Clock,
        items: [
            { name: "Lumpia Ayam", price: 25000 },
            { name: "Nasi Goreng Ayam", price: 25000 },
            { name: "Mie Goreng Asia", price: 30000 },
        ]
    },
    {
        category: "Seasonal Special",
        icon: Zap,
        items: [
            { name: "Soto Tangkar", price: 53000 },
            { name: "Miso Ramen", price: 53000 },
        ]
    },
    {
        category: "Fave Breakfast Menu",
        icon: Clock,
        items: [
            { name: "Beef Bacon Egg Croissant Sandwich", price: 61500 },
        ]
    },
    {
        category: "Fave Snack Menu",
        icon: Utensils,
        items: [
            { name: "Chicken Popcorn", price: 41500 },
            { name: "Kulit Ayam Lada Garam", price: 28500 },
        ]
    },
    {
        category: "Fave Sweet Treats",
        icon: Utensils,
        items: [
            { name: "Sweet Pot Brulee", price: 31500 },
        ]
    },
    {
        category: "Breakfast",
        icon: Clock,
        items: [
            { name: "KOFU Big Breakie", price: 53500 },
            { name: "Classic Sandwich", price: 38500 },
        ]
    },
    {
        category: "Salad",
        icon: Leaf,
        items: [
            { name: "Caesar Salad", price: 51500 },
            { name: "Chicken Pesto Salad", price: 51500 },
            { name: "Thai Beef Salad", price: 67000 },
            { name: "Mushroom Soba Salad", price: 62500 },
        ]
    },
    {
        category: "Light Bites",
        icon: Utensils,
        items: [
            { name: "Platter", price: 68000 },
            { name: "Tahu Lada Garam", price: 27500 },
            { name: "The Fritters", price: 49500 },
            { name: "Macaroni Ball", price: 37000 },
            { name: "Daggogi Mandu", price: 61500 },
            { name: "Potato Mentai", price: 40500 },
            { name: "Truffle Fries", price: 37500 },
            { name: "Fried Enoki", price: 30500 },
            { name: "Bratwurst & Fries", price: 61000 },
            { name: "Mac & Cheese", price: 42000 },
            { name: "Corn Ribs", price: 29500 },
        ]
    },
    {
        category: "Rice Signature",
        icon: Utensils,
        items: [
            { name: "Nasi Goreng Cikur", price: 41000 },
            { name: "Nasi Goreng KOFU", price: 57000 },
            { name: "Nasi Goreng Mawut", price: 52000 },
            { name: "Nasi Cumi Sambal Merah", price: 51500 },
            { name: "Nasi Bakar Tuna Ketjombrang", price: 47000 },
            { name: "Nasi Bakar Sambal Cumi", price: 50500 },
        ]
    },
    {
        category: "Rice Bowl",
        icon: Utensils,
        items: [
            { name: "Dori Matah Rice Bowl", price: 48500 },
            { name: "Tuna Mentai Rice Bowl", price: 44500 },
            { name: "Chicken Popcorn Salted Egg Rice Bowl", price: 47000 },
            { name: "Chicken Katsu Curry Rice Bowl", price: 55000 },
        ]
    },
    {
        category: "Asian Food",
        icon: Utensils,
        items: [
            { name: "Tom Yum", price: 63000 },
            { name: "Bubur Ayam KOFU", price: 40000 },
            { name: "Soto Lamongan", price: 45500 },
        ]
    },
    {
        category: "Spagetthi",
        icon: Utensils,
        items: [
            { name: "Carbonara", price: 62500 },
            { name: "Aglio E Olio", price: 34500 },
            { name: "Chicken Popcorn Sambal Matah", price: 41500 },
            { name: "Chicken Diane", price: 62000 },
        ]
    },
    {
        category: "Sweet Treats",
        icon: Utensils,
        items: [
            { name: "Pisang Goreng KOFU", price: 26500 },
            { name: "Churros", price: 29500 },
            { name: "Tiramisu Flood", price: 53000 },
            { name: "Kaya Toast", price: 24000 },
        ]
    },
    {
        category: "Coffee",
        icon: Coffee,
        items: [
            { name: "Espresso", hotPrice: 27500, coldPrice: 31000 },
            { name: "Black", hotPrice: 31000, coldPrice: 31000 },
            { name: "Gibraltar", hotPrice: 31000, coldPrice: null },
            { name: "Cafe Latte", hotPrice: 33000, coldPrice: 35500 },
            { name: "Flat White", hotPrice: 31000, coldPrice: null },
            { name: "Mocha", hotPrice: 38500, coldPrice: 42000 },
            { name: "Confetti", hotPrice: null, coldPrice: 42000 },
            { name: "Cappucino", hotPrice: 31000, coldPrice: 39000 },
            { name: "Black Lemonade", hotPrice: null, coldPrice: 36500 },
            { name: "Filter Coffee", hotPrice: 38500, coldPrice: 42000 },
            { name: "Flavour Latte", hotPrice: 42000, coldPrice: 42000 },
        ]
    },
    {
        category: "Milk Based",
        icon: Coffee,
        items: [
            { name: "Chocolate", hotPrice: 33000, coldPrice: 35500 },
            { name: "Matcha", hotPrice: 35500, coldPrice: 38500 },
            { name: "Red Velvet", hotPrice: 35500, coldPrice: 38500 },
            { name: "Klepon", hotPrice: null, coldPrice: 33000 },
        ]
    },
    {
        category: "Mocktails",
        icon: Coffee,
        items: [
            { name: "Berry Apple", price: 38500 },
            { name: "Four Summer", price: 38500 },
            { name: "Putu Lanang", price: 28000 },
            { name: "Blackberries", price: 28000 },
            { name: "Chocopop", price: 28000 },
        ]
    },
    {
        category: "Tea",
        icon: Coffee,
        items: [
            { name: "Classic Earl Grey", hotPrice: 39000, coldPrice: null },
            { name: "Peppermint", hotPrice: 39000, coldPrice: null },
            { name: "Chamomile", hotPrice: 39000, coldPrice: null },
            { name: "Jasmine", hotPrice: 39000, coldPrice: null },
            { name: "Lemon Tea", hotPrice: null, coldPrice: 33000 },
            { name: "Peach Tea", hotPrice: null, coldPrice: 33000 },
            { name: "Lychee Tea", hotPrice: null, coldPrice: 33000 },
            { name: "Black Tea", hotPrice: null, coldPrice: 22000 },
        ]
    },
];

// Helper function for Rupiah formatting
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(number);
};


// --- FIREBASE HOOK ---

const useFirebase = () => {
    const [firebaseReady, setFirebaseReady] = useState(false);

    useEffect(() => {
        if (!Object.keys(firebaseConfig).length) {
            console.error("Firebase configuration is missing.");
            return;
        }

        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            setLogLevel('Debug'); // Enable debug logging for Firestore

            // Handle the initial custom token sign-in if available
            const signInAndSetup = async () => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                    setFirebaseReady(true);
                } catch (error) {
                    console.error("Firebase Auth Error:", error);
                }
            };
            signInAndSetup();

        } catch (error) {
            console.error("Firebase Initialization Failed:", error);
        }
    }, []);

    return { db, auth, firebaseReady };
};

// --- APPLICATION COMPONENTS ---

const ROLES = {
    OWNER: 'Owner',
    FINANCE: 'Finance',
    BARISTA: 'Barista',
    HEAD_CHEF: 'Head Chef',
    KASIR: 'Kasir',
};

/**
 * Utility to ensure user roles are set up in Firestore for the demo.
 * The authentication status (loggedInUser) is now managed outside of this setup
 * using localStorage for the demo login simulation.
 */
const setupInitialUsers = async (db, appId) => {
    if (!db) return;

    const usersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');

    try {
        const q = query(usersCollectionRef);
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("Setting up initial user roles...");
            for (const mockUser of MOCK_USERS_AUTH) {
                // Use the username as a simple ID for the mock user document
                const docId = mockUser.username;

                await setDoc(doc(usersCollectionRef, docId), {
                    role: mockUser.role,
                    name: mockUser.name,
                    username: mockUser.username,
                    createdAt: serverTimestamp(),
                });
            }
        }
    } catch (e) {
        console.error("Error setting up initial users:", e);
    }
};

// --- DATA HOOKS ---

/**
 * Fetches data from a specified collection.
 */
const useFirestoreData = (db, appId, collectionName, isAuthReady) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !isAuthReady) {
            if (isAuthReady) setLoading(false);
            return;
        }

        const dataPath = ['artifacts', appId, 'public', 'data', collectionName];
        const colRef = collection(db, ...dataPath);

        // Sort by createdAt descending for requisitions and POs. For inventory, sort by name.
        const sortField = collectionName === 'inventory' ? 'name' : 'createdAt';
        const sortDirection = collectionName === 'inventory' ? 'asc' : 'desc';

        const q = query(colRef, orderBy(sortField, sortDirection));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setData(list);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, appId, collectionName, isAuthReady]);

    return { data, loading };
};

// --- UI COMPONENTS ---

const Card = ({ children, title, className = '' }) => (
    <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-100 ${className}`}>
        {title && <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{title}</h3>}
        {children}
    </div>
);

const CtaButton = ({ children, onClick, disabled = false, className = 'bg-indigo-600 hover:bg-indigo-700', type = 'button' }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2 text-white font-semibold rounded-lg transition duration-150 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {children}
    </button>
);

const StatusBadge = ({ status }) => {
    let color = 'bg-gray-200 text-gray-700';
    if (status === 'Approved' || status === 'Payment Sent') color = 'bg-green-100 text-green-700 border border-green-300';
    if (status === 'Pending Owner') color = 'bg-yellow-100 text-yellow-700 border border-yellow-300';
    if (status === 'Pending Finance' || status === 'PO Issued') color = 'bg-blue-100 text-blue-700 border border-blue-600';
    if (status === 'Rejected') color = 'bg-red-100 text-red-700 border border-red-300';
    if (status === 'Barang Diterima') color = 'bg-lime-100 text-lime-700 border border-lime-400';

    return (
        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${color}`}>
            {status}
        </span>
    );
};

// --- AUTHENTICATION COMPONENTS ---

const AuthPage = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [token, setToken] = useState('');
    const [isLoginView, setIsLoginView] = useState(true);
    const [error, setError] = useState('');

    const handleAuth = (e) => {
        e.preventDefault();
        setError('');

        if (isLoginView) {
            // LOGIN logic (Check against MOCK_USERS_AUTH)
            const user = MOCK_USERS_AUTH.find(u => u.username === username && u.token === token);

            if (user) {
                // Successful login simulation
                const userData = {
                    id: user.username, // Use username as unique ID for demo
                    role: user.role,
                    name: user.name,
                    username: user.username,
                };
                localStorage.setItem('kofuUser', JSON.stringify(userData));
                onLoginSuccess(userData);
            } else {
                setError('Username atau Token salah. Coba lagi.');
            }
        } else {
            // REGISTER logic (Disabled for this demo, as users must be pre-defined)
            setError('Pendaftaran (Register) dinonaktifkan. Silakan gunakan Username/Token yang sudah ditentukan.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card title={isLoginView ? "KOFU Management Login" : "KOFU Management Register (Demo)"} className="w-full max-w-md">
                <p className="text-sm text-center text-gray-500 mb-6">
                    Akses KOFU Management System. Silakan gunakan kredensial demo di bawah.
                </p>

                <div className="bg-yellow-50 p-3 rounded-lg text-sm mb-6 border border-yellow-200">
                    <p className="font-semibold text-yellow-800">Kredensial Demo:</p>
                    <ul className="list-disc list-inside text-gray-700 mt-1">
                        <li>Owner: `kofu.owner` / `Owner123`</li>
                        <li>Finance: `kofu.finance` / `Finance123`</li>
                        <li>Barista: `kofu.barista` / `Barista123`</li>
                        <li>Head Chef: `kofu.chef` / `Chef123`</li>
                        <li>Kasir: `kofu.kasir` / `Kasir123`</li>
                    </ul>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            placeholder="e.g. kofu.owner"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Token (Password)</label>
                        <input
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            placeholder="e.g. Owner123"
                            required
                        />
                    </div>
                    <CtaButton type="submit" className="w-full">
                        {isLoginView ? 'Login' : 'Register (Disabled)'}
                    </CtaButton>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLoginView(!isLoginView)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 transition duration-150"
                    >
                        {isLoginView ? "Tidak punya akun? (Register Dinonaktifkan)" : "Sudah punya akun? Login"}
                    </button>
                </div>
            </Card>
        </div>
    );
};

// --- BARISTA/CHEF ROLE VIEW COMPONENTS ---

// Komponen baru untuk menampilkan daftar menu
const MenuList = () => {
    const [expandedCategory, setExpandedCategory] = useState(KOFU_MENU[0].category);

    const toggleCategory = (categoryName) => {
        setExpandedCategory(expandedCategory === categoryName ? null : categoryName);
    };

    return (
        <Card title="Daftar Menu KOFU & Harga Jual">
            <p className="text-sm text-gray-500 mb-4">Informasi harga jual untuk referensi pesanan dan Point of Sales (POS).</p>
            <div className="space-y-3">
                {KOFU_MENU.map((categoryData) => (
                    <div key={categoryData.category} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                            className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition duration-150 font-semibold text-gray-700 text-left"
                            onClick={() => toggleCategory(categoryData.category)}
                        >
                            <span className="flex items-center space-x-2">
                                <categoryData.icon className="w-5 h-5 text-indigo-500" />
                                <span>{categoryData.category}</span>
                            </span>
                            {expandedCategory === categoryData.category ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {expandedCategory === categoryData.category && (
                            <div className="p-4 bg-white">
                                <ul className="space-y-1">
                                    {categoryData.items.map((item, index) => (
                                        <li key={index} className="flex justify-between items-center text-sm border-b border-dashed last:border-b-0 py-2">
                                            <span className="text-gray-900">{item.name}</span>
                                            <span className="font-mono text-indigo-600 font-semibold text-right">
                                                {item.price ? formatRupiah(item.price) :
                                                    item.hotPrice && item.coldPrice ? (
                                                        <span>
                                                            H: {formatRupiah(item.hotPrice)} | C: {formatRupiah(item.coldPrice)}
                                                        </span>
                                                    ) : item.hotPrice ? (
                                                        <span>H: {formatRupiah(item.hotPrice)}</span>
                                                    ) : item.coldPrice ? (
                                                        <span>C: {formatRupiah(item.coldPrice)}</span>
                                                    ) : 'Harga N/A'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    );
};

/**
 * Form untuk mengajukan Purchase Requisition (PR).
 */
const RequisitionForm = ({ db, appId, userId, userName }) => {
    const [item, setItem] = useState('');
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!item || !qty || !unit || !reason) {
            console.error("Semua field harus diisi!");
            return;
        }

        setLoading(true);
        const prRef = collection(db, 'artifacts', appId, 'public', 'data', 'requisitions');

        try {
            await addDoc(prRef, {
                item,
                quantity: Number(qty),
                unit,
                reason,
                requestedBy: userName,
                requesterId: userId,
                status: 'Pending Finance', // Alur: Barista/Chef -> Finance
                createdAt: serverTimestamp(),
                financeApproved: false,
                ownerApproved: false,
                poGenerated: false,
            });
            console.log("Permintaan berhasil diajukan!");
            setItem('');
            setQty('');
            setUnit('');
            setReason('');
        } catch (error) {
            console.error("Error submitting PR:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="1. Form Pengajuan Purchase Requisition (PR)">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Form fields: Item, Qty, Unit, Reason */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nama Barang</label>
                    <input
                        type="text"
                        value={item}
                        onChange={(e) => setItem(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        placeholder="Contoh: Biji Kopi Arabika, Susu Segar"
                    />
                </div>
                <div className="flex space-x-4">
                    <div className="w-1/3">
                        <label className="block text-sm font-medium text-gray-700">Kuantitas</label>
                        <input
                            type="number"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            min="1"
                        />
                    </div>
                    <div className="w-2/3">
                        <label className="block text-sm font-medium text-gray-700">Satuan</label>
                        <input
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            placeholder="Contoh: Kg, Liter, Pcs"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Alasan Permintaan (Mendesak/Stok Minimum)</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows="3"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                </div>
                <CtaButton type="submit" disabled={loading} className="w-full">
                    {loading ? 'Mengirim...' : 'Ajukan Permintaan (PR)'}
                </CtaButton>
            </form>
        </Card>
    );
};

/**
 * Form Penerimaan Barang (Goods Receipt).
 */
const GoodsReceiptForm = ({ db, appId, userId, userName, inventory }) => {
    const [itemName, setItemName] = useState('');
    const [qtyReceived, setQtyReceived] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

    // Update selected item data when itemName changes
    useEffect(() => {
        const item = inventory.find(i => i.name === itemName);
        setSelectedInventoryItem(item);
    }, [itemName, inventory]);


    const handleReceiveGoods = async (e) => {
        e.preventDefault();
        if (!itemName || !qtyReceived || !selectedInventoryItem || Number(qtyReceived) <= 0) {
            console.error("Silakan pilih barang dan masukkan kuantitas yang valid.");
            return;
        }

        setLoading(true);
        const inventoryRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', selectedInventoryItem.id);
        const receiptLogRef = collection(db, 'artifacts', appId, 'public', 'data', 'goodsReceipts');

        const qty = Number(qtyReceived);

        try {
            // 1. Update Inventory (Add Stock)
            await updateDoc(inventoryRef, {
                stock: selectedInventoryItem.stock + qty,
            });

            // 2. Log Goods Receipt Document
            await addDoc(receiptLogRef, {
                inventoryId: selectedInventoryItem.id,
                itemName: selectedInventoryItem.name,
                unit: selectedInventoryItem.unit,
                quantity: qty,
                receivedBy: userName,
                receivedById: userId,
                status: 'Barang Diterima',
                createdAt: serverTimestamp(),
            });

            console.log(`Berhasil mencatat penerimaan ${qty} ${selectedInventoryItem.unit} ${selectedInventoryItem.name}. Stok diperbarui.`);
            setItemName('');
            setQtyReceived('');
        } catch (error) {
            console.error("Error logging goods receipt:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="2. Form Penerimaan Barang (Goods Receipt)">
            <p className="text-sm text-gray-500 mb-4">Catat barang yang masuk dari Supplier. Stok akan **BERTAMBAH**.</p>
            <form onSubmit={handleReceiveGoods} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nama Barang</label>
                    <select
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                    >
                        <option value="">-- Pilih Barang --</option>
                        {inventory.map(item => (
                            <option key={item.id} value={item.name}>{item.name} (Stok: {item.stock} {item.unit})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Kuantitas Diterima ({selectedInventoryItem?.unit || 'Unit'})</label>
                    <input
                        type="number"
                        value={qtyReceived}
                        onChange={(e) => setQtyReceived(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        min="1"
                        required
                    />
                </div>
                <CtaButton type="submit" disabled={loading} className="w-full bg-lime-600 hover:bg-lime-700">
                    {loading ? 'Mencatat...' : 'Konfirmasi Penerimaan Barang'}
                </CtaButton>
            </form>
        </Card>
    );
};

/**
 * Form Log Pemakaian Inventori Harian.
 */
const InventoryUsageLogForm = ({ db, appId, userId, userName, inventory }) => {
    const [itemName, setItemName] = useState('');
    const [qtyUsed, setQtyUsed] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

    // Update selected item data when itemName changes
    useEffect(() => {
        const item = inventory.find(i => i.name === itemName);
        setSelectedInventoryItem(item);
    }, [itemName, inventory]);

    const handleLogUsage = async (e) => {
        e.preventDefault();
        if (!itemName || !qtyUsed || !selectedInventoryItem || Number(qtyUsed) <= 0) {
            console.error("Silakan pilih barang dan masukkan kuantitas yang valid.");
            return;
        }

        const qty = Number(qtyUsed);
        if (qty > selectedInventoryItem.stock) {
            console.error("Kuantitas yang digunakan melebihi stok yang tersedia!");
            return;
        }

        setLoading(true);
        const inventoryRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', selectedInventoryItem.id);
        const usageLogRef = collection(db, 'artifacts', appId, 'public', 'data', 'usageLogs');

        try {
            // 1. Update Inventory (Reduce Stock)
            await updateDoc(inventoryRef, {
                stock: selectedInventoryItem.stock - qty,
                lastUsed: serverTimestamp(),
            });

            // 2. Log Usage Document
            await addDoc(usageLogRef, {
                inventoryId: selectedInventoryItem.id,
                itemName: selectedInventoryItem.name,
                unit: selectedInventoryItem.unit,
                quantity: qty,
                loggedBy: userName,
                loggedById: userId,
                createdAt: serverTimestamp(),
            });

            console.log(`Berhasil mencatat pemakaian ${qty} ${selectedInventoryItem.unit} ${selectedInventoryItem.name}. Stok diperbarui.`);
            setItemName('');
            setQtyUsed('');
        } catch (error) {
            console.error("Error logging inventory usage:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="3. Log Pemakaian Inventori Harian">
            <p className="text-sm text-gray-500 mb-4">Catat bahan baku yang dikonsumsi harian untuk produksi. Stok akan **BERKURANG**.</p>
            <form onSubmit={handleLogUsage} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nama Barang</label>
                    <select
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                    >
                        <option value="">-- Pilih Barang --</option>
                        {inventory.map(item => (
                            <option key={item.id} value={item.name}>{item.name} (Stok: {item.stock} {item.unit})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Kuantitas Digunakan ({selectedInventoryItem?.unit || 'Unit'})</label>
                    <input
                        type="number"
                        value={qtyUsed}
                        onChange={(e) => setQtyUsed(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        min="0.01" // Allow small quantities
                        step="any"
                        required
                    />
                    {selectedInventoryItem && Number(qtyUsed) > selectedInventoryItem.stock && (
                        <p className="text-sm text-red-500 mt-1">Kuantitas melebihi stok tersedia ({selectedInventoryItem.stock} {selectedInventoryItem.unit}).</p>
                    )}
                </div>
                <CtaButton type="submit" disabled={loading || (selectedInventoryItem && Number(qtyUsed) > selectedInventoryItem.stock)} className="w-full bg-blue-600 hover:bg-blue-700">
                    {loading ? 'Mencatat...' : 'Log Pemakaian'}
                </CtaButton>
            </form>
        </Card>
    );
};

const BaristaChefView = ({ db, appId, userId, userName }) => {
    const [activeTab, setActiveTab] = useState('inventory');
    const { data: requisitions, loading: loadingPR } = useFirestoreData(db, appId, 'requisitions', true);
    const { data: inventory, loading: loadingInv } = useFirestoreData(db, appId, 'inventory', true);

    // Initial Inventory Setup
    useEffect(() => {
        if (!loadingInv && inventory.length === 0 && db && appId) {
            const invRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
            // Menambahkan properti default yang diperlukan
            addDoc(invRef, { name: 'Biji Kopi Arabika', stock: 15, unit: 'Kg', minStock: 10, lastUsed: null, createdAt: serverTimestamp() });
            addDoc(invRef, { name: 'Susu Full Cream', stock: 50, unit: 'Liter', minStock: 20, lastUsed: null, createdAt: serverTimestamp() });
            addDoc(invRef, { name: 'Gula Cair', stock: 35, unit: 'Liter', minStock: 15, lastUsed: null, createdAt: serverTimestamp() });
            addDoc(invRef, { name: 'Teh Hijau', stock: 10, unit: 'Kotak', minStock: 5, lastUsed: null, createdAt: serverTimestamp() });
        }
    }, [loadingInv, inventory.length, db, appId]);

    const myRequisitions = requisitions.filter(pr => pr.requesterId === userId);
    // Filter stok yang mencapai atau di bawah minimum
    const criticalInventory = inventory.filter(item => item.stock <= item.minStock).sort((a, b) => a.name.localeCompare(b.name));

    const renderTabContent = () => {
        if (activeTab === 'inventory') {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <RequisitionForm db={db} appId={appId} userId={userId} userName={userName} />
                        <GoodsReceiptForm db={db} appId={appId} userId={userId} userName={userName} inventory={inventory} />
                        <InventoryUsageLogForm db={db} appId={appId} userId={userId} userName={userName} inventory={inventory} />
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        {/* Stok Minimum Section */}
                        {criticalInventory.length > 0 && (
                            <Card title="Peringatan: Stok Kritis (Reorder Point)" className="border-2 border-red-300 bg-red-50">
                                <p className="mb-3 text-red-700 text-sm font-semibold">Stok di bawah batas minimum. Segera ajukan Purchase Requisition (PR).</p>
                                <div className="flex flex-wrap gap-2">
                                    {criticalInventory.map(item => (
                                        <span key={item.id} className="px-3 py-1 bg-red-200 text-red-800 text-xs font-bold rounded-full">
                                            {item.name}: {item.stock} {item.unit} (Min: {item.minStock})
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        )}

                        <Card title="Informasi Stok Barang (Inventory)">
                            {loadingInv ? (
                                <p>Memuat Stok...</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barang</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Saat Ini</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Min.</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terakhir Digunakan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {inventory.map(item => (
                                                <tr key={item.id} className={item.stock <= item.minStock ? 'bg-red-50 font-semibold' : ''}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.stock}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.minStock}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {item.lastUsed?.toDate ? item.lastUsed.toDate().toLocaleDateString() : 'Belum pernah'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>

                        <Card title="Riwayat Permintaan Saya (PR)">
                            {loadingPR ? (
                                <p>Memuat Riwayat PR...</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diajukan</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {myRequisitions.length > 0 ? myRequisitions.map(pr => (
                                                <tr key={pr.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pr.item}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pr.quantity} {pr.unit}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {pr.createdAt?.toDate ? pr.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <StatusBadge status={pr.status} />
                                                    </td>
                                                </tr>
                                            )) : <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">Belum ada permintaan yang diajukan.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            );
        } else if (activeTab === 'menu') {
            return <MenuList />;
        }
        return null;
    };


    return (
        <div className="space-y-6">
            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`pb-2 px-4 text-lg font-semibold transition duration-150 ${activeTab === 'inventory' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                >
                    Manajemen Inventori & Permintaan
                </button>
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`pb-2 px-4 text-lg font-semibold transition duration-150 ${activeTab === 'menu' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                >
                    Daftar Menu KOFU
                </button>
            </div>
            {renderTabContent()}
        </div>
    );
};

// --- FINANCE ROLE VIEW (PR Review & PO Generation) ---

const FinanceView = ({ db, appId, userId, userName }) => {
    const { data: requisitions, loading: loadingPR } = useFirestoreData(db, appId, 'requisitions', true);
    const { data: purchaseOrders, loading: loadingPO } = useFirestoreData(db, appId, 'purchaseOrders', true);

    // Filter PRs that are Pending Finance approval
    const pendingPRs = requisitions.filter(pr => pr.status === 'Pending Finance' && pr.financeApproved === false);

    const handleFinanceReview = async (prId, approve) => {
        if (!db) return;
        const prRef = doc(db, 'artifacts', appId, 'public', 'data', 'requisitions', prId);

        try {
            await updateDoc(prRef, {
                financeApproved: approve,
                status: approve ? 'Pending Owner' : 'Rejected', // Lanjut ke Owner jika disetujui
                financeReviewer: userName,
                financeReviewDate: serverTimestamp(),
            });
            console.log(`Permintaan ${prId} telah di${approve ? 'setujui' : 'tolak'} oleh Finance.`);
        } catch (error) {
            console.error("Error updating PR status:", error);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Finance Dashboard</h2>
            <Card title="1. Daftar Purchase Requisition (PR) Menunggu Review Finance">
                {loadingPR ? (
                    <p>Memuat PR...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty/Unit</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diajukan Oleh</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alasan</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pendingPRs.length > 0 ? pendingPRs.map(pr => (
                                    <tr key={pr.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pr.id.substring(0, 6)}...</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{pr.item}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{pr.quantity} {pr.unit}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{pr.requestedBy}</td>
                                        <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">{pr.reason}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium flex space-x-2 justify-center">
                                            <CtaButton onClick={() => handleFinanceReview(pr.id, true)} className="bg-blue-500 hover:bg-blue-600">Approve</CtaButton>
                                            <CtaButton onClick={() => handleFinanceReview(pr.id, false)} className="bg-red-500 hover:bg-red-600">Reject</CtaButton>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="6" className="px-4 py-4 text-center text-gray-500">Tidak ada PR menunggu persetujuan Finance.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card title="2. Riwayat Purchase Order (PO) yang Telah Dibuat">
                {loadingPO ? (
                    <p>Memuat PO...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID PO</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Nilai</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Dibuat</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {purchaseOrders.map(po => (
                                    <tr key={po.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.id.substring(0, 6)}...</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.totalValue ? formatRupiah(po.totalValue) : 'N/A'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.supplier}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm"><StatusBadge status={po.status} /></td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {po.createdAt?.toDate ? po.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Card title="3. Informasi Keuangan Perusahaan (Simulasi)">
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600">Total Pengeluaran PO (Disetujui Owner)</p>
                        <p className="text-xl font-bold text-blue-800">{formatRupiah(purchaseOrders.filter(po => po.status === 'Payment Sent').reduce((sum, po) => sum + (po.totalValue || 0), 0))}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-600">Nilai PO Menunggu Pembayaran</p>
                        <p className="text-xl font-bold text-yellow-800">{formatRupiah(purchaseOrders.filter(po => po.status === 'PO Issued' && po.ownerApproved === false).reduce((sum, po) => sum + (po.totalValue || 0), 0))}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600">Total PR Disetujui (Menjadi PO)</p>
                        <p className="text-xl font-bold text-green-800">{purchaseOrders.length} Dokumen</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- OWNER ROLE VIEW (Full Access & PO Approval/Payment) ---

const POForm = ({ db, appId, prData, setModalOpen, userName }) => {
    const [supplier, setSupplier] = useState('PT Kopi Lokal');
    // Mock price, simple calculation for demo
    const initialPrice = prData.item.toLowerCase().includes('kopi') ? prData.quantity * 150000 :
                         prData.item.toLowerCase().includes('susu') ? prData.quantity * 25000 :
                         prData.quantity * 40000;

    const [price, setPrice] = useState(initialPrice);
    const [loading, setLoading] = useState(false);

    const handleCreatePO = async (e) => {
        e.preventDefault();
        if (!supplier || !price || price <= 0) return;

        setLoading(true);
        const poRef = collection(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders');
        const prDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'requisitions', prData.id);

        try {
            // 1. Create Purchase Order (PO)
            const newPODoc = await addDoc(poRef, {
                prId: prData.id,
                item: prData.item,
                quantity: prData.quantity,
                unit: prData.unit,
                supplier,
                totalValue: Number(price),
                status: 'PO Issued',
                ownerApproved: false, // Menunggu Owner Approval di tahap ini
                poGeneratedBy: userName,
                createdAt: serverTimestamp(),
            });

            // 2. Update Requisition status
            await updateDoc(prDocRef, {
                status: 'PO Issued',
                poGenerated: true,
                poId: newPODoc.id
            });

            console.log(`Purchase Order (PO) berhasil dibuat dengan nilai ${formatRupiah(Number(price))}. Menunggu persetujuan Owner.`);
            setModalOpen(false);
        } catch (error) {
            console.error("Error creating PO:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">Buat Purchase Order (PO)</h3>
            <p className="mb-4 text-sm text-gray-600">PR #<span className="font-mono text-gray-800 font-semibold">{prData.id.substring(0, 8)}</span> untuk <strong>{prData.item}</strong> ({prData.quantity} {prData.unit}).</p>
            <form onSubmit={handleCreatePO} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Pemasok (Supplier)</label>
                    <input
                        type="text"
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Total Nilai PO (Estimasi Harga)</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        required
                        min="1000"
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <CtaButton onClick={() => setModalOpen(false)} className="bg-gray-500 hover:bg-gray-600">Batal</CtaButton>
                    <CtaButton type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                        {loading ? 'Membuat PO...' : 'Buat PO'}
                    </CtaButton>
                </div>
            </form>
        </div>
    );
};

const OwnerView = ({ db, appId, userId, userName }) => {
    const { data: requisitions, loading: loadingPR } = useFirestoreData(db, appId, 'requisitions', true);
    const { data: purchaseOrders, loading: loadingPO } = useFirestoreData(db, appId, 'purchaseOrders', true);

    const [prModalOpen, setPrModalOpen] = useState(false);
    const [selectedPR, setSelectedPR] = useState(null);

    // PR yang sudah disetujui Finance tapi belum dijadikan PO oleh Owner
    const prsPendingOwnerPO = requisitions.filter(pr =>
        pr.status === 'Pending Owner' && pr.financeApproved === true && pr.poGenerated === false
    );

    // PO yang sudah dibuat tapi belum disetujui/dibayar oleh Owner
    const posPendingOwnerPayment = purchaseOrders.filter(po =>
        po.status === 'PO Issued' && po.ownerApproved === false
    );

    // PO yang sudah disetujui dan dibayar
    const paidPOs = purchaseOrders.filter(po => po.status === 'Payment Sent');


    // ACTION: OWNER APPROVES PO/Payment
    const handleOwnerApproval = async (poId) => {
        // Simple confirmation using window.confirm (idealnya pakai modal custom)
        if (!window.confirm("Yakin menyetujui PO ini dan memproses pembayaran?")) return;

        if (!db) return;
        const poRef = doc(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders', poId);

        try {
            await updateDoc(poRef, {
                ownerApproved: true,
                status: 'Payment Sent', // Pembayaran dilakukan, Invoice Payment dihasilkan
                ownerReviewer: userName,
                ownerReviewDate: serverTimestamp(),
                invoicePaymentGenerated: true, // Output yang dikembalikan ke Owner
            });

            // Update associated PR status (for tracking)
            const poData = purchaseOrders.find(po => po.id === poId);
            if (poData?.prId) {
                const prRef = doc(db, 'artifacts', appId, 'public', 'data', 'requisitions', poData.prId);
                await updateDoc(prRef, { status: 'Payment Sent' });
            }

            console.log(`PO ${poId.substring(0, 6)} disetujui & Pembayaran telah diproses. Invoice Payment dihasilkan.`);
        } catch (error) {
            console.error("Error approving PO/Payment:", error);
        }
    };

    // ACTION: OWNER REJECTS PO
    const handleOwnerReject = async (poId) => {
        if (!window.confirm("Yakin menolak PO ini? Ini akan membatalkan proses pembelian.")) return;
        if (!db) return;
        const poRef = doc(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders', poId);

        try {
            await updateDoc(poRef, {
                ownerApproved: false,
                status: 'Rejected',
                ownerReviewer: userName,
                ownerReviewDate: serverTimestamp(),
            });

            // Update associated PR status
            const poData = purchaseOrders.find(po => po.id === poId);
            if (poData?.prId) {
                const prRef = doc(db, 'artifacts', appId, 'public', 'data', 'requisitions', poData.prId);
                await updateDoc(prRef, { status: 'Rejected' });
            }

            console.log(`PO ${poId.substring(0, 6)} telah DITOLAK.`);
        } catch (error) {
            console.error("Error rejecting PO:", error);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Owner Dashboard (Full Access)</h2>

            {/* Modal for creating PO */}
            {prModalOpen && selectedPR && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <POForm
                        db={db}
                        appId={appId}
                        prData={selectedPR}
                        setModalOpen={setPrModalOpen}
                        userName={userName}
                    />
                </div>
            )}

            {/* Section 3: Financial Information Access */}
            <Card title="Informasi Keuangan (Ringkasan">
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600">Total Pengeluaran Pembelian</p>
                        <p className="text-xl font-bold text-blue-800">{formatRupiah(paidPOs.reduce((sum, po) => sum + (po.totalValue || 0), 0))}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-600">Nilai PO Menunggu Persetujuan</p>
                        <p className="text-xl font-bold text-yellow-800">{formatRupiah(posPendingOwnerPayment.reduce((sum, po) => sum + (po.totalValue || 0), 0))}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600">Total Invoice Payment Diterbitkan</p>
                        <p className="text-xl font-bold text-green-800">{paidPOs.length} Dokumen</p>
                    </div>
                </div>
            </Card>

            {/* Section 1: PRs Ready for PO Generation (Finance Approved) */}
            <Card title="1. Purchase Requisition (PR) Siap Dibuatkan PO">
                {loadingPR ? (
                    <p>Memuat PR...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty/Unit</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {prsPendingOwnerPO.length > 0 ? prsPendingOwnerPO.map(pr => (
                                    <tr key={pr.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pr.id.substring(0, 6)}...</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{pr.item}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{pr.quantity} {pr.unit}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            <StatusBadge status={pr.status} />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <CtaButton
                                                onClick={() => { setSelectedPR(pr); setPrModalOpen(true); }}
                                                className="bg-green-500 hover:bg-green-600 text-xs"
                                            >
                                                Buat PO
                                            </CtaButton>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="5" className="px-4 py-4 text-center text-gray-500">Tidak ada PR menunggu pembuatan PO.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Section 2: POs Ready for Owner Approval/Payment */}
            <Card title="2. Purchase Order (PO) Menunggu Persetujuan & Pembayaran">
                {loadingPO ? (
                    <p>Memuat PO...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID PO</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item (Qty)</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Nilai</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {posPendingOwnerPayment.length > 0 ? posPendingOwnerPayment.map(po => (
                                    <tr key={po.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.id.substring(0, 6)}...</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.supplier}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.item} ({po.quantity} {po.unit})</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                                            {formatRupiah(po.totalValue)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium flex space-x-2 justify-center">
                                            <CtaButton onClick={() => handleOwnerApproval(po.id)} className="bg-indigo-600 hover:bg-indigo-700">Approve & Bayar</CtaButton>
                                            <CtaButton onClick={() => handleOwnerReject(po.id)} className="bg-red-500 hover:bg-red-600">Tolak PO</CtaButton>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="5" className="px-4 py-4 text-center text-gray-500">Tidak ada PO menunggu persetujuan/pembayaran Owner.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Section 4: Riwayat Invoice Payment (Output yang dikembalikan ke Owner) */}
            <Card title="3. Riwayat Invoice Payment (PO yang Sudah Dibayar)">
                {loadingPO ? (
                    <p>Memuat Invoice...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID PO</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai Pembayaran</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Pembayaran</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paidPOs.length > 0 ? paidPOs.map(po => (
                                    <tr key={po.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.id.substring(0, 6)}...</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                            {formatRupiah(po.totalValue)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {po.ownerReviewDate?.toDate ? po.ownerReviewDate.toDate().toLocaleDateString() : 'N/A'}
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="3" className="px-4 py-4 text-center text-gray-500">Belum ada pembayaran yang diselesaikan.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

// --- MAIN APPLICATION LAYOUT ---

const App = () => {
    const { db, firebaseReady } = useFirebase();
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Effect for checking session/localStorage on startup and setting up initial data
    useEffect(() => {
        if (firebaseReady) {
            // 1. Setup Firebase initial user documents (roles)
            setupInitialUsers(db, appId).then(() => {
                // 2. Check local storage for active session (demo login)
                const storedUser = localStorage.getItem('kofuUser');
                if (storedUser) {
                    try {
                        const user = JSON.parse(storedUser);
                        setLoggedInUser(user);
                    } catch (e) {
                        localStorage.removeItem('kofuUser');
                        console.error("Error parsing stored user data:", e);
                    }
                }
                setLoadingUser(false);
            }).catch(e => {
                console.error("Initial setup failed:", e);
                setLoadingUser(false);
            });
        }
    }, [db, firebaseReady]);

    const handleLogout = () => {
        localStorage.removeItem('kofuUser');
        setLoggedInUser(null);
    };

    const renderView = () => {
        if (!firebaseReady || loadingUser) {
            return <div className="text-center p-10 text-gray-500">Memuat Aplikasi & Data Awal...</div>;
        }

        if (!loggedInUser) {
            return <AuthPage onLoginSuccess={setLoggedInUser} />;
        }

        switch (loggedInUser.role) {
            case ROLES.OWNER:
                return <OwnerView db={db} appId={appId} userId={loggedInUser.id} userName={loggedInUser.name} />;
            case ROLES.FINANCE:
                return <FinanceView db={db} appId={appId} userId={loggedInUser.id} userName={loggedInUser.name} />;
            case ROLES.BARISTA:
            case ROLES.HEAD_CHEF:
                return <BaristaChefView db={db} appId={appId} userId={loggedInUser.id} userName={loggedInUser.name} />;
            case ROLES.KASIR:
                return (
                       <KasirView
                            userName={loggedInUser.name}
                    />
    );

            default:
                return <div className="text-center p-10 text-red-500">Akses Ditolak: Peran tidak dikenali atau belum diatur.</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans p-6">
            <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-md mb-6">
                <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">
                    KOFU Management System
                </h1>
                <div className="flex items-center space-x-4">
                    {loggedInUser ? (
                        <>
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-800">{loggedInUser.name}</p>
                                <p className={`text-xs font-bold ${loggedInUser.role === ROLES.OWNER ? 'text-red-500' : loggedInUser.role === ROLES.FINANCE ? 'text-blue-500' : 'text-green-500'}`}>{loggedInUser.role}</p>
                                <p className="text-[10px] text-gray-400">UID: {loggedInUser.id}</p>
                            </div>
                            <CtaButton onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-sm">
                                Logout
                            </CtaButton>
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">Silakan Login</p>
                    )}
                </div>
            </header>

            <main>
                {renderView()}
            </main>
        </div>
    );
};
// =======================
// = KasirView Component =
// =======================
const KasirView = ({ userName }) => {
  const TAX_RATE = 0.10;

  const menuData = [
    { id: 1, name: "Kopi Americano", price: 25000, category: "Kopi" },
    { id: 2, name: "Kopi Susu Gula Aren", price: 30000, category: "Kopi" },
    { id: 3, name: "Latte Karamel", price: 35000, category: "Kopi" },
    { id: 4, name: "Teh Lemon", price: 20000, category: "Non-Kopi" },
    { id: 5, name: "Air Mineral", price: 10000, category: "Non-Kopi" },
    { id: 6, name: "Croissant Cokelat", price: 28000, category: "Roti" },
    { id: 7, name: "Kue Keju", price: 40000, category: "Kue" },
    { id: 8, name: "Nasi Goreng Spesial", price: 50000, category: "Nasi" },
  ];

  const [order, setOrder] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState("pos");
  const [modal, setModal] = React.useState(null);
  const [salesLog, setSalesLog] = React.useState([]);

  const subtotal = order.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const addItemToOrder = item => {
    setOrder(prev => {
      const found = prev.find(p => p.id === item.id);
      if (found) {
        return prev.map(p =>
          p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setOrder(prev =>
      prev
        .map(p =>
          p.id === id ? { ...p, quantity: p.quantity + delta } : p
        )
        .filter(p => p.quantity > 0)
    );
  };

  const processPayment = () => {
    if (order.length === 0) {
      setModal({ title: "Gagal", message: "Keranjang kosong." });
      return;
    }

    const receipt = order
      .map(i => `${i.name} (${i.quantity}x) - Rp ${(i.price * i.quantity).toLocaleString("id-ID")}`)
      .join("\n");

    const id = "SALES" + Date.now().toString().slice(-6);

    setSalesLog(prev => [
      {
        id,
        time: new Date().toLocaleString(),
        total,
        items: order,
      },
      ...prev,
    ]);

    setModal({
      title: "Pembayaran Berhasil",
      message:
        `Total: Rp ${total.toLocaleString("id-ID")}\n\n` +
        `=== Rincian ===\n${receipt}`,
    });

    setOrder([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">POS - Kasir</h2>
        <div className="text-right">
          <p className="text-sm">Kasir: <b>{userName}</b></p>
          <p className="text-sm">Total: <b className="text-indigo-600">Rp {total.toLocaleString("id-ID")}</b></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-3 rounded-xl shadow flex space-x-2">
        {["pos", "history", "stock"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-semibold ${
              activeTab === tab ? "bg-indigo-600 text-white" : "text-gray-600"
            }`}
          >
            {tab === "pos" ? "POS" : tab === "history" ? "Riwayat" : "Stok"}
          </button>
        ))}
      </div>

      {/* POS */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu */}
          <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow max-h-[70vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Pilih Menu</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {menuData.map(item => (
                <div
                  key={item.id}
                  className="p-3 border rounded-xl cursor-pointer hover:shadow-md"
                  onClick={() => addItemToOrder(item)}
                >
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.category}</p>
                  <p className="text-indigo-600 font-bold mt-2">
                    Rp {item.price.toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="bg-white p-4 rounded-xl shadow flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Pesanan</h3>

            <div className="flex-grow space-y-3 overflow-y-auto">
              {order.length === 0 && (
                <p className="text-gray-400 text-center">Keranjang kosong</p>
              )}

              {order.map(it => (
                <div
                  key={it.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-semibold">{it.name}</p>
                    <p className="text-xs">Rp {it.price.toLocaleString()}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      className="border px-2 rounded"
                      onClick={() => changeQty(it.id, -1)}
                    >
                      -
                    </button>
                    <span className="font-bold w-6 text-center">{it.quantity}</span>
                    <button
                      className="border px-2 rounded"
                      onClick={() => changeQty(it.id, 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="font-bold w-20 text-right">
                    Rp {(it.price * it.quantity).toLocaleString("id-ID")}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pajak (10%)</span>
                <span>Rp {tax.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>Rp {total.toLocaleString("id-ID")}</span>
              </div>

              <button
                onClick={processPayment}
                className={`w-full py-3 rounded-lg font-bold ${
                  order.length === 0
                    ? "bg-gray-300"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
                disabled={order.length === 0}
              >
                Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat */}
      {activeTab === "history" && (
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-lg font-semibold mb-4">Riwayat Penjualan</h3>

          {salesLog.length === 0 && (
            <p className="text-gray-500">Belum ada transaksi</p>
          )}

          {salesLog.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Waktu</th>
                  <th className="p-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {salesLog.map(t => (
                  <tr key={t.id}>
                    <td className="p-2">{t.id}</td>
                    <td className="p-2">{t.time}</td>
                    <td className="p-2 font-bold text-green-600">
                      Rp {t.total.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Stok */}
      {activeTab === "stock" && (
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-lg font-semibold mb-4">Cek Stok Cepat</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {menuData.map(m => (
              <div key={m.id} className="p-3 border rounded-lg">
                <p className="font-semibold">{m.name}</p>
                <p className="text-xs text-gray-500">{m.category}</p>
                <p className="text-xs text-gray-400 mt-2">Stok: —</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full shadow-lg">
            <h3 className="text-xl font-bold mb-3">{modal.title}</h3>
            <pre className="text-gray-700 whitespace-pre-line">{modal.message}</pre>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;