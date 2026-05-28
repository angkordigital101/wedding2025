/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, 
  Users, 
  DollarSign, 
  Search, 
  Plus, 
  Check, 
  UserCheck, 
  Trash2, 
  Settings, 
  LogOut, 
  Smartphone, 
  MessageSquare, 
  Download, 
  UserPlus, 
  Lock, 
  User, 
  Database,
  QrCode,
  Sparkles,
  Info,
  Calendar,
  AlertCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Types representing current database structure
interface Admin {
  id?: string;
  username: string;
  password?: string;
}

interface Wedding {
  id: string;
  title: string;
  host_username: string;
  host_password?: string;
  khqr_img_url: string;
  created_at?: string;
}

interface Guest {
  id: string;
  wedding_id: string;
  name: string;
  phone: string;
  companions: number;
  relation_type: string; // ខាងកូនកំលោះ, ខាងកូនក្រមុំ, មិត្តភក្តិ, ផ្សេងៗ
  amount: number;
  note: string;
  status: 'pending' | 'approved';
  created_at?: string;
}

// Default Seed Data for Sandbox Mode
const DEFAULT_WEDDINGS: Wedding[] = [
  {
    id: 'd3b07384-d113-4ec2-a521-4f16a0487532',
    title: 'មង្គលការ សុខា & ចិត្រា',
    host_username: 'host123',
    host_password: 'password123',
    khqr_img_url: 'https://i.ibb.co/VMyBvR9/demo-khqr.png'
  },
  {
    id: 'e4c18495-e224-5fd3-b632-5g27b1598643',
    title: 'មង្គលការ ពិសិដ្ឋ & សុភ័ក្ត្រ',
    host_username: 'piseth123',
    host_password: 'password123',
    khqr_img_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=ABA_PAYMENT_URL'
  }
];

const DEFAULT_GUESTS: Guest[] = [
  {
    id: 'guest-1',
    wedding_id: 'd3b07384-d113-4ec2-a521-4f16a0487532',
    name: 'ម៉ៅ សំណាង',
    phone: '012345678',
    companions: 1,
    relation_type: 'ខាងកូនកំលោះ',
    amount: 50,
    note: 'សូមជូនពរអោយមានសុភមង្គល និងស្រលាញ់គ្នារហូតដល់ចាស់កោងខ្នង!',
    status: 'approved',
    created_at: new Date(Date.now() - 36000000).toISOString()
  },
  {
    id: 'guest-2',
    wedding_id: 'd3b07384-d113-4ec2-a521-4f16a0487532',
    name: 'កែវ សុភា',
    phone: '098765432',
    companions: 2,
    relation_type: 'ខាងកូនក្រមុំ',
    amount: 100,
    note: 'រីករាយថ្ងៃអាពាហ៍ពិពាហ៍! សូមកូនប្រុសស្រីមានវាសនាល្អ!',
    status: 'approved',
    created_at: new Date(Date.now() - 18000000).toISOString()
  },
  {
    id: 'guest-3',
    wedding_id: 'd3b07384-d113-4ec2-a521-4f16a0487532',
    name: 'ស៊ិន ស៊ីសាមុត',
    phone: '011223344',
    companions: 0,
    relation_type: 'មិត្តភក្តិ',
    amount: 30,
    note: 'ជូនពរមិត្តសម្លាញ់មានភ័ព្វសំណាងល្អ!',
    status: 'pending',
    created_at: new Date(Date.now() - 5000000).toISOString()
  },
  {
    id: 'guest-4',
    wedding_id: 'e4c18495-e224-5fd3-b632-5g27b1598643',
    name: 'ចាន់ មុនី',
    phone: '088776655',
    companions: 3,
    relation_type: 'ខាងកូនក្រមុំ',
    amount: 80,
    note: 'ជូនពរអោយឆាប់បានកូនពង្សកូនផ្សារ!',
    status: 'approved',
    created_at: new Date(Date.now() - 25000000).toISOString()
  }
];

export default function App() {
  // Views navigation state
  const [activeTab, setActiveTab] = useState<'guest' | 'admin' | 'host'>('guest');

  // Supabase Configuration State
  const [supabaseUrl, setSupabaseUrl] = useState<string>(() => {
    return (window as any).env?.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || localStorage.getItem('__sb_url') || '';
  });
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>(() => {
    return (window as any).env?.SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem('__sb_key') || '';
  });
  const [isDbConfigOpen, setIsDbConfigOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // App Core Database States (loaded either from Supabase or local Sandbox)
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([{ username: 'admin123', password: 'password123' }]);

  // Public Guest Submission Form States
  const [selectedWeddingId, setSelectedWeddingId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCompanions, setGuestCompanions] = useState(0);
  const [guestRelation, setGuestRelation] = useState('មិត្តភក្តិ');
  const [guestAmount, setGuestAmount] = useState('');
  const [guestNote, setGuestNote] = useState('');
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Authenticated State for Admin
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  // Admin Wedding Selector state inside dashboard
  const [adminSelectedWeddingId, setAdminSelectedWeddingId] = useState<string>('');

  // Admin: Create Wedding states
  const [newWeddingTitle, setNewWeddingTitle] = useState('');
  const [newWeddingHostUser, setNewWeddingHostUser] = useState('');
  const [newWeddingHostPass, setNewWeddingHostPass] = useState('');
  const [newWeddingKhqrUrl, setNewWeddingKhqrUrl] = useState('');
  const [weddingAddMessage, setWeddingAddMessage] = useState({ text: '', type: '' });

  // Admin Manual Add Guest states
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCompanions, setManualCompanions] = useState(0);
  const [manualRelation, setManualRelation] = useState('មិត្តភក្តិ');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [adminGuestSearch, setAdminGuestSearch] = useState('');

  // Authenticated State for Host
  const [isHostLoggedIn, setIsHostLoggedIn] = useState(false);
  const [hostUsername, setHostUsername] = useState('');
  const [hostPassword, setHostPassword] = useState('');
  const [hostLoginError, setHostLoginError] = useState('');
  const [hostLoggedWedding, setHostLoggedWedding] = useState<Wedding | null>(null);
  const [hostGuestSearch, setHostGuestSearch] = useState('');

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Trigger Toast
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Memoized Supabase Client instantiation
  const supabase = useMemo(() => {
    if (supabaseUrl && supabaseAnonKey) {
      try {
        return createClient(supabaseUrl, supabaseAnonKey);
      } catch (e) {
        console.error("Supabase client init error:", e);
        return null;
      }
    }
    return null;
  }, [supabaseUrl, supabaseAnonKey]);

  // Handle Supabase Connection Verification
  useEffect(() => {
    if (supabase) {
      setConnectionStatus('connecting');
      // Attempt verification query to test keys
      supabase.from('weddings').select('id').limit(1)
        .then(({ error }) => {
          if (error) {
            console.warn("Supabase check fail:", error.message);
            setConnectionStatus('error');
          } else {
            setConnectionStatus('connected');
            triggerToast('បានភ្ជាប់ជាមួយ Supabase Database ដោយជោគជ័យ!', 'success');
            loadDatabase();
          }
        })
        .catch(() => {
          setConnectionStatus('error');
        });
    } else {
      setConnectionStatus('disconnected');
      loadFallbackData();
    }
  }, [supabase]);

  // Load Database from either Supabase or Local Storage fallback
  const loadDatabase = async () => {
    if (supabase && connectionStatus === 'connected') {
      try {
        const { data: weddingsData, error: wedErr } = await supabase.from('weddings').select('*').order('created_at', { ascending: false });
        const { data: guestsData, error: gErr } = await supabase.from('guests').select('*').order('created_at', { ascending: false });
        const { data: adminsData, error: admErr } = await supabase.from('admins').select('*');

        if (!wedErr && weddingsData) setWeddings(weddingsData);
        if (!gErr && guestsData) setGuests(guestsData);
        if (!admErr && adminsData && adminsData.length > 0) setAdmins(adminsData);
      } catch (err) {
        console.error("Error fetching data:", err);
        loadFallbackData();
      }
    } else {
      loadFallbackData();
    }
  };

  // Fallback state initialization
  const loadFallbackData = () => {
    const savedWeddings = localStorage.getItem('__sb_sandbox_weddings');
    const savedGuests = localStorage.getItem('__sb_sandbox_guests');
    const savedAdmins = localStorage.getItem('__sb_sandbox_admins');

    if (savedWeddings) {
      setWeddings(JSON.parse(savedWeddings));
    } else {
      setWeddings(DEFAULT_WEDDINGS);
      localStorage.setItem('__sb_sandbox_weddings', JSON.stringify(DEFAULT_WEDDINGS));
    }

    if (savedGuests) {
      setGuests(JSON.parse(savedGuests));
    } else {
      setGuests(DEFAULT_GUESTS);
      localStorage.setItem('__sb_sandbox_guests', JSON.stringify(DEFAULT_GUESTS));
    }

    if (savedAdmins) {
      setAdmins(JSON.parse(savedAdmins));
    } else {
      setAdmins([{ username: 'admin123', password: 'password123' }]);
      localStorage.setItem('__sb_sandbox_admins', JSON.stringify([{ username: 'admin123', password: 'password123' }]));
    }
  };

  // Sync state to local storage when in Sandbox fallback mode
  const syncSandboxToLocalStorage = (updatedWeddings?: Wedding[], updatedGuests?: Guest[], updatedAdmins?: Admin[]) => {
    if (connectionStatus !== 'connected') {
      if (updatedWeddings) {
        localStorage.setItem('__sb_sandbox_weddings', JSON.stringify(updatedWeddings));
        setWeddings(updatedWeddings);
      }
      if (updatedGuests) {
        localStorage.setItem('__sb_sandbox_guests', JSON.stringify(updatedGuests));
        setGuests(updatedGuests);
      }
      if (updatedAdmins) {
        localStorage.setItem('__sb_sandbox_admins', JSON.stringify(updatedAdmins));
        setAdmins(updatedAdmins);
      }
    }
  };

  // Auto-select first wedding if none chosen
  useEffect(() => {
    if (weddings.length > 0 && !selectedWeddingId) {
      setSelectedWeddingId(weddings[0].id);
    }
    if (weddings.length > 0 && !adminSelectedWeddingId) {
      setAdminSelectedWeddingId(weddings[0].id);
    }
  }, [weddings, selectedWeddingId, adminSelectedWeddingId]);

  // Current Info helpers
  const currentWeddingDetails = useMemo(() => {
    return weddings.find(w => w.id === selectedWeddingId) || null;
  }, [weddings, selectedWeddingId]);

  const currentAdminWeddingDetails = useMemo(() => {
    return weddings.find(w => w.id === adminSelectedWeddingId) || null;
  }, [weddings, adminSelectedWeddingId]);

  // Filtered Guests list for Admin
  const filteredGuestsForAdmin = useMemo(() => {
    return guests.filter(g => {
      if (g.wedding_id !== adminSelectedWeddingId) return false;
      if (!adminGuestSearch) return true;
      const term = adminGuestSearch.toLowerCase();
      return (g.name?.toLowerCase().includes(term) || g.phone?.includes(term));
    });
  }, [guests, adminSelectedWeddingId, adminGuestSearch]);

  // Filtered Guests and stats for Host
  const hostGuests = useMemo(() => {
    if (!hostLoggedWedding) return [];
    return guests.filter(g => g.wedding_id === hostLoggedWedding.id);
  }, [guests, hostLoggedWedding]);

  const filteredGuestsForHost = useMemo(() => {
    return hostGuests.filter(g => {
      if (!hostGuestSearch) return true;
      const term = hostGuestSearch.toLowerCase();
      return (g.name?.toLowerCase().includes(term) || g.phone?.includes(term));
    });
  }, [hostGuests, hostGuestSearch]);

  const hostStats = useMemo(() => {
    const totalRegistered = hostGuests.length;
    // Approved guests plus their companions (excluding pending ones)
    const approvedGuestsList = hostGuests.filter(g => g.status === 'approved');
    const totalAttendees = approvedGuestsList.reduce((sum, g) => sum + 1 + (Number(g.companions) || 0), 0);
    const totalGiftAmount = approvedGuestsList.reduce((sum, g) => sum + (Number(g.amount) || 0), 0);

    return { totalRegistered, totalAttendees, totalGiftAmount };
  }, [hostGuests]);

  // Admin login procedure
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminAccount = admins.find(a => a.username === adminUsername && a.password === adminPassword);
    if (adminAccount) {
      setIsAdminLoggedIn(true);
      setAdminLoginError('');
      triggerToast('ការចូលជាអ្នកគ្រប់គ្រងបានសម្រេច!', 'success');
    } else {
      setAdminLoginError('ឈ្មោះ ឬលេខសម្ងាត់របស់អ្នកសម្របសម្រួលមិនត្រឹមត្រូវទេ!');
      triggerToast('ការចូលគណនីបានបរាជ័យ', 'error');
    }
  };

  // Host login procedure
  const handleHostLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const matchingWedding = weddings.find(w => w.host_username === hostUsername && w.host_password === hostPassword);
    if (matchingWedding) {
      setHostLoggedWedding(matchingWedding);
      setIsHostLoggedIn(true);
      setHostLoginError('');
      triggerToast(`សូមស្វាគមន៍មកកាន់ ${matchingWedding.title}!`, 'success');
    } else {
      setHostLoginError('ឈ្មោះគណនី ឬលេខសម្ងាត់របស់ម្ចាស់ការមិនត្រឹមត្រូវទេ!');
      triggerToast('ការចូលគណនីបានបរាជ័យ', 'error');
    }
  };

  // Guest Register Submission
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeddingId) {
      triggerToast('សូមជ្រើសរើសពិធីមង្គលការជាមុនសិន!', 'error');
      return;
    }
    if (!guestName.trim()) {
      triggerToast('សូមបញ្ជាក់ឈ្មោះរបស់អ្នក!', 'error');
      return;
    }

    setIsFormSubmitting(true);
    const cleanAmount = parseFloat(guestAmount) || 0;

    const newGuestData = {
      id: crypto.randomUUID(),
      wedding_id: selectedWeddingId,
      name: guestName.trim(),
      phone: guestPhone.trim(),
      companions: Number(guestCompanions) || 0,
      relation_type: guestRelation,
      amount: cleanAmount,
      note: guestNote.trim(),
      status: 'pending' as const,
      created_at: new Date().toISOString()
    };

    if (supabase && connectionStatus === 'connected') {
      try {
        const { error } = await supabase.from('guests').insert([newGuestData]);
        if (error) throw error;
        
        setIsSubmitSuccess(true);
        triggerToast('ការចុះឈ្មោះរបស់អ្នកទទួលបានជោគជ័យ!', 'success');
        loadDatabase();
      } catch (err: any) {
        console.error("Supabase insert guest failed:", err);
        triggerToast('បរាជ័យក្នុងការចុះឈ្មោះ៖ ' + err.message, 'error');
      } finally {
        setIsFormSubmitting(false);
      }
    } else {
      // Offline fallback state update
      const updated = [newGuestData, ...guests];
      syncSandboxToLocalStorage(undefined, updated);
      setIsSubmitSuccess(true);
      setIsFormSubmitting(false);
      triggerToast('ការចុះឈ្មោះជាសាកល្បងទទួលបានជោគជ័យ!', 'success');
    }
  };

  // Admin approves guest
  const approveGuest = async (id: string) => {
    if (supabase && connectionStatus === 'connected') {
      try {
        const { error } = await supabase.from('guests').update({ status: 'approved' }).eq('id', id);
        if (error) throw error;
        triggerToast('បានអនុម័តភ្ញៀវរួចរាល់!', 'success');
        loadDatabase();
      } catch (err: any) {
        triggerToast('ការអនុម័តបរាជ័យ៖ ' + err.message, 'error');
      }
    } else {
      const updated = guests.map(g => g.id === id ? { ...g, status: 'approved' as const } : g);
      syncSandboxToLocalStorage(undefined, updated);
      triggerToast('បានអនុម័តជាសាកល្បងរួចរាល់!', 'success');
    }
  };

  // Admin deletes guest
  const deleteGuest = async (id: string) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបភ្ញៀវម្នាក់នេះមែនទេ?')) return;

    if (supabase && connectionStatus === 'connected') {
      try {
        const { error } = await supabase.from('guests').delete().eq('id', id);
        if (error) throw error;
        triggerToast('បានលុបភ្ញៀវរួចរាល់!', 'info');
        loadDatabase();
      } catch (err: any) {
        triggerToast('ការលុបបរាជ័យ៖ ' + err.message, 'error');
      }
    } else {
      const updated = guests.filter(g => g.id !== id);
      syncSandboxToLocalStorage(undefined, updated);
      triggerToast('បានលុបជាសាកល្បងរួចរាល់!', 'info');
    }
  };

  // Admin: Create wedding
  const handleCreateWedding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeddingTitle.trim()) {
      setWeddingAddMessage({ text: 'សូមបញ្ចូលចងចំណងជើងមង្គលការ!', type: 'error' });
      return;
    }
    if (!newWeddingHostUser.trim() || !newWeddingHostPass.trim()) {
      setWeddingAddMessage({ text: 'សូមបញ្ចូលឈ្មោះគណនី និងលេខសម្ងាត់សម្រាប់ម្ចាស់ការ!', type: 'error' });
      return;
    }

    const newId = crypto.randomUUID();
    const newWeddingData = {
      id: newId,
      title: newWeddingTitle.trim(),
      host_username: newWeddingHostUser.trim(),
      host_password: newWeddingHostPass.trim(),
      khqr_img_url: newWeddingKhqrUrl.trim() || 'https://i.ibb.co/VMyBvR9/demo-khqr.png'
    };

    if (supabase && connectionStatus === 'connected') {
      try {
        const { error } = await supabase.from('weddings').insert([newWeddingData]);
        if (error) throw error;

        setWeddingAddMessage({ text: 'បង្កើតកម្មវិធីមង្គលការថ្មីបានជោគជ័យ!', type: 'success' });
        setNewWeddingTitle('');
        setNewWeddingHostUser('');
        setNewWeddingHostPass('');
        setNewWeddingKhqrUrl('');
        setAdminSelectedWeddingId(newId);
        loadDatabase();
        setTimeout(() => setWeddingAddMessage({ text: '', type: '' }), 4000);
      } catch (err: any) {
        setWeddingAddMessage({ text: 'បង្កើតបរាជ័យ៖ ' + err.message, type: 'error' });
      }
    } else {
      const updated = [...weddings, newWeddingData];
      syncSandboxToLocalStorage(updated);
      setWeddingAddMessage({ text: 'បង្កើតកម្មវិធីមង្គលការជាសាកល្បងបានជោគជ័យ!', type: 'success' });
      setNewWeddingTitle('');
      setNewWeddingHostUser('');
      setNewWeddingHostPass('');
      setNewWeddingKhqrUrl('');
      setAdminSelectedWeddingId(newId);
      setTimeout(() => setWeddingAddMessage({ text: '', type: '' }), 4000);
    }
  };

  // Admin manually adds guest
  const handleAdminAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSelectedWeddingId) {
      triggerToast('សូមជ្រើសរើសពិធីមង្គលការជាមុនសិន!', 'error');
      return;
    }
    if (!manualName.trim()) {
      triggerToast('សូមបញ្ជាក់ឈ្មោះភ្ញៀវ!', 'error');
      return;
    }

    const cleanAmount = parseFloat(manualAmount) || 0;
    const newGuestData = {
      id: crypto.randomUUID(),
      wedding_id: adminSelectedWeddingId,
      name: manualName.trim(),
      phone: manualPhone.trim(),
      companions: Number(manualCompanions) || 0,
      relation_type: manualRelation,
      amount: cleanAmount,
      note: manualNote.trim(),
      status: 'approved' as const, // For admin additions, default immediately to approved
      created_at: new Date().toISOString()
    };

    if (supabase && connectionStatus === 'connected') {
      try {
        const { error } = await supabase.from('guests').insert([newGuestData]);
        if (error) throw error;
        triggerToast('បានបញ្ចូលភ្ញៀវសម្រេច!', 'success');
        setManualName('');
        setManualPhone('');
        setManualCompanions(0);
        setManualAmount('');
        setManualNote('');
        loadDatabase();
      } catch (err: any) {
        triggerToast('ការបញ្ចូលភ្ញៀវបរាជ័យ៖ ' + err.message, 'error');
      }
    } else {
      const updated = [newGuestData, ...guests];
      syncSandboxToLocalStorage(undefined, updated);
      triggerToast('បានបញ្ចូលភ្ញៀវជាសាកល្បងសម្រេច!', 'success');
      setManualName('');
      setManualPhone('');
      setManualCompanions(0);
      setManualAmount('');
      setManualNote('');
    }
  };

  // Export Host Guest List to Excel using SheetJS
  const exportToExcel = () => {
    if (!hostLoggedWedding || hostGuests.length === 0) {
      triggerToast('គ្មានទិន្នន័យដើម្បីនាំចេញទេ!', 'info');
      return;
    }

    // Format fields with clean Khmer header names
    const dataToExport = hostGuests.map((g, index) => ({
      'ល.រ': index + 1,
      'ឈ្មោះភ្ញៀវ': g.name,
      'លេខទូរស័ព្ទ': g.phone || 'គ្មាន',
      'ចំនួនអ្នកមកជាមួយ': g.companions,
      'ប្រភេទទំនាក់ទំនង': g.relation_type,
      'ប្រាក់ចងដៃ (USD)': g.amount,
      'កំណត់សម្គាល់': g.note || '-',
      'ស្ថានភាព': g.status === 'approved' ? 'បានអនុម័ត' : 'រង់ចាំការពិនិត្យ',
      'កាលបរិច្ឆេទចុះឈ្មោះ': new Date(g.created_at || '').toLocaleDateString('km-KH')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'បញ្ជីឈ្មោះភ្ញៀវ');

    // Create a safe and nice Excel download file
    const safeTitle = hostLoggedWedding.title.replace(/\s+/g, '_');
    XLSX.writeFile(workbook, `បញ្ជីឈ្មោះភ្ញៀវ_${safeTitle}.xlsx`);
    triggerToast('បានទាញយកបញ្ជីឈ្មោះភ្ញៀវជាឯកសារ Excel រួចរាល់!', 'success');
  };

  // Database Connection Persistence
  const saveDatabaseConnection = () => {
    localStorage.setItem('__sb_url', supabaseUrl);
    localStorage.setItem('__sb_key', supabaseAnonKey);
    setIsDbConfigOpen(false);
    triggerToast('បានរក្សាទុកព័ត៌មានភ្ជាប់ Supabase រួចរាល់! កំពុងព្យាយាមតភ្ជាប់...', 'info');
  };

  const clearDatabaseConnection = () => {
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    localStorage.removeItem('__sb_url');
    localStorage.removeItem('__sb_key');
    setIsDbConfigOpen(false);
    setConnectionStatus('disconnected');
    triggerToast('បានផ្តាច់ការភ្ជាប់ Supabase។ កំពុងដំណើរការក្នុង sandbox offline...', 'info');
    loadFallbackData();
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col antialiased selection:bg-rose-100 selection:text-rose-900 pb-12">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-bounce max-w-sm w-full bg-white shadow-xl rounded-xl border border-stone-100 p-4 flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
            toast.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {toast.type === 'success' ? <Check className="w-5 h-5" /> : 
             toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-stone-900">
              {toast.type === 'success' ? 'ជោគជ័យ' : toast.type === 'error' ? 'មានបញ្ហា' : 'ដំណឹង'}
            </h4>
            <p className="text-xs text-stone-600 mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Top Database Mode Indicator */}
      <div className="w-full bg-stone-900 text-stone-300 py-2.5 px-4 text-xs shadow-inner">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-rose-400" />
            <span>
              ប្រភពទិន្នន័យ៖{' '}
              {connectionStatus === 'connected' ? (
                <span className="text-emerald-400 font-bold">● Supabase Database (Live)</span>
              ) : connectionStatus === 'connecting' ? (
                <span className="text-amber-400 font-bold animate-pulse">● កំពុងតភ្ជាប់ Supabase...</span>
              ) : (
                <span className="text-rose-400 font-bold">● Local Sandbox Mode (សាកល្បងដោយគ្មាន Database)</span>
              )}
            </span>
          </div>
          <button 
            onClick={() => setIsDbConfigOpen(!isDbConfigOpen)}
            className="flex items-center gap-1.5 text-stone-300 hover:text-white bg-white/10 px-2.5 py-1 rounded transition-colors text-[11px]"
          >
            <Settings className="w-3 h-3" />
            <span>កែសម្រួលការភ្ជាប់ Supabase (SQL API)</span>
          </button>
        </div>
      </div>

      {/* Database Setup Panel */}
      {isDbConfigOpen && (
        <div className="w-full bg-stone-800 border-b border-stone-700 p-4 sm:p-6 transition-all">
          <div className="max-w-xl mx-auto space-y-4">
            <h3 className="text-white text-sm font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-rose-400" />
              <span>ការកំណត់ភ្ជាប់ជាមួយផ្ទាំងទិន្នន័យ Supabase Real Database</span>
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              បំពេញព័ត៌មាន API របស់ Supabase Project របស់អ្នកដើម្បីធ្វើអោយកម្មវិធីដំណើរការរក្សាទុកទិន្នន័យពិតប្រាកដ។ ប្រសិនបើទុកចោល វានឹងដំណើរការក្នុងរបៀបរៀនសូត្រ (Local Sandbox Mode) ស្វ័យប្រវត្តិ។
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-stone-400 font-medium mb-1">SUPABASE_URL</label>
                <input 
                  type="text" 
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full text-xs text-white bg-stone-900 border border-stone-700 rounded px-3 py-2 focus:ring-1 focus:ring-rose-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 font-medium mb-1">SUPABASE_ANON_KEY</label>
                <input 
                  type="password" 
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="your-anon-key..."
                  className="w-full text-xs text-white bg-stone-900 border border-stone-700 rounded px-3 py-2 focus:ring-1 focus:ring-rose-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={clearDatabaseConnection}
                className="text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 px-3.5 py-1.5 rounded transition"
              >
                លុបការភ្ជាប់
              </button>
              <button 
                onClick={saveDatabaseConnection}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-1.5 rounded shadow transition"
              >
                រក្សាទុក និងតភ្ជាប់
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Wedding Header Design */}
      <header className="relative bg-white border-b border-stone-200/80 pt-8 pb-6 overflow-hidden">
        {/* Decorative wedding graphics */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-300 via-amber-200 to-rose-300"></div>
        <div className="absolute -right-12 -top-12 w-32 h-32 bg-rose-50 rounded-full blur-2xl opacity-80"></div>
        <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-amber-50 rounded-full blur-2xl opacity-80"></div>

        <div className="max-w-4xl mx-auto px-4 text-center space-y-3 relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full text-rose-600 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 fill-rose-600" />
            <span>រក្សាទុកទិន្នន័យមង្គលការ និងចងដៃ</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-stone-800 tracking-tight leading-snug">
            ប្រព័ន្ធគ្រប់គ្រង និងចុះឈ្មោះភ្ញៀវកិត្តិយស
          </h1>
          <p className="text-sm text-stone-500 max-w-lg mx-auto leading-relaxed">
            សូមស្វាគមន៍មកកាន់ប្រព័ន្ធសម្របសម្រួលអាពាហ៍ពិពាហ៍តាមបែបឌីជីថល ងាយស្រួលចុះឈ្មោះ និងការរៀបចំស្ថិតិចងដៃច្បាស់លាស់។
          </p>

          {/* Navigational Tabs */}
          <div className="flex justify-center pt-4">
            <div className="inline-flex p-1 bg-stone-100 rounded-xl space-x-1 border border-stone-200/50">
              <button
                onClick={() => setActiveTab('guest')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'guest' 
                    ? 'bg-white text-rose-600 shadow-sm' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <UserCheck className="w-4 h-4 text-rose-500" />
                <span>🤵 សម្រាប់ភ្ញៀវចូលរួម</span>
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'admin' 
                    ? 'bg-white text-rose-600 shadow-sm' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Settings className="w-4 h-4 text-stone-500" />
                <span>🛠️ អ្នកសម្របសម្រួល (Admin)</span>
              </button>
              <button
                onClick={() => setActiveTab('host')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'host' 
                    ? 'bg-white text-rose-600 shadow-sm' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Users className="w-4 h-4 text-amber-500" />
                <span>📊 ម្ចាស់ដើមការ (Host)</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Workspace Page Grid */}
      <main className="max-w-4xl mx-auto px-4 w-full mt-8 flex-1">
        
        {/* VIEW 1: GUEST REGISTRATION (PUBLIC) */}
        {activeTab === 'guest' && (
          <div className="space-y-6">
            {/* Success View Screen */}
            {isSubmitSuccess ? (
              <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center shadow-lg space-y-6 animate-pulse max-w-xl mx-auto relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-2 bg-emerald-500"></div>
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-black text-stone-800">ការចុះឈ្មោះរបស់អ្នកទទួលបានជោគជ័យ!</h2>
                  <p className="text-stone-600 text-sm leading-relaxed max-w-md mx-auto">
                    សូមអរគុណយ៉ាងជ្រាលជ្រៅសម្រាប់ការផ្ដល់ព័ត៌មានមកកាន់យើងខ្ញុំ។ យើងខ្ញុំបានកត់ត្រាទិន្នន័យរួចហើយ។ សូមរង់ចាំការពិនិត្យ និងយល់ព្រមពីអ្នកសម្របសម្រួលមង្គលការ។
                  </p>
                </div>
                
                {/* QR Code and digital billing block if they set an amount */}
                {parseFloat(guestAmount) > 0 && currentWeddingDetails && (
                  <div className="border border-amber-100 bg-amber-50/50 rounded-2xl p-6 max-w-md mx-auto space-y-4">
                    <p className="text-xs font-bold text-amber-800 flex items-center justify-center gap-1.5">
                      <QrCode className="w-4 h-4 text-amber-600" />
                      <span>សូមស្កែន QR Code ដើម្បីបញ្ជូនថវិការចងដៃឌីជីថល៖</span>
                    </p>
                    <div className="bg-white p-4 rounded-xl shadow-inner max-w-[200px] mx-auto border border-stone-200">
                      <img 
                        src={currentWeddingDetails.khqr_img_url} 
                        alt="KHQR Code" 
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto aspect-square object-contain"
                        onError={(e) => {
                          // Fallback to demo QR pattern if link is broken
                          (e.currentTarget as HTMLImageElement).src = 'https://i.ibb.co/VMyBvR9/demo-khqr.png';
                        }}
                      />
                    </div>
                    <div>
                      <span className="text-xs text-stone-500 block">ចំនួនប្រាក់ដែលអ្នកបានកត់ត្រា៖</span>
                      <span className="text-lg font-black text-rose-600">${parseFloat(guestAmount).toLocaleString()} USD</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-stone-100">
                  <button
                    onClick={() => {
                      setIsSubmitSuccess(false);
                      setGuestName('');
                      setGuestPhone('');
                      setGuestCompanions(0);
                      setGuestAmount('');
                      setGuestNote('');
                    }}
                    className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase px-6 py-3 rounded-xl shadow transition"
                  >
                    ចុះឈ្មោះភ្ញៀវថ្មីបន្ថែមទៀត
                  </button>
                </div>
              </div>
            ) : (
              /* Registration Form Screen */
              <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12">
                
                {/* Left informational side panel */}
                <div className="md:col-span-4 bg-gradient-to-br from-rose-50 via-rose-50/30 to-rose-100/50 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-200">
                  <div className="space-y-6">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-rose-100 shadow-sm flex items-center justify-center text-rose-500">
                      <Heart className="w-6 h-6 fill-rose-500" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-black text-lg text-stone-800">សេចក្ដីណែនាំ</h3>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        សូមបំពេញព័ត៌មាននៅក្នុងទម្រង់នេះ ដើម្បីកត់ត្រាចំនួនភ្ញៀវចូលរួម និងចំនួនថវិការចងដៃ (ប្រសិនបើចង់ផ្ញើជាឌីជីថល)។ ព័ត៌មាននេះនឹងជួយឲ្យម្ចាស់កម្មវិធីរៀបចំអាហារ និងកន្លែងអង្គុយបានល្អបំផុត។
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 space-y-4">
                    <div className="flex items-center gap-3 text-stone-700">
                      <Smartphone className="w-4 h-4 text-stone-500 shrink-0" />
                      <span className="text-[11px] leading-tight font-medium">គាំទ្រការវាយបញ្ជូលលើទូរស័ព្ទដៃ</span>
                    </div>
                    <div className="flex items-center gap-3 text-stone-700">
                      <QrCode className="w-4 h-4 text-stone-500 shrink-0" />
                      <span className="text-[11px] leading-tight font-medium">ស្កែន QR ផ្ទេរប្រាក់ផ្ទាល់ទៅកាន់ម្ចាស់ការ</span>
                    </div>
                  </div>
                </div>

                {/* Right Input Form */}
                <form onSubmit={handleGuestSubmit} className="md:col-span-8 p-6 sm:p-8 space-y-5">
                  <div className="border-b border-stone-100 pb-4">
                    <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-rose-500" />
                      <span>បំពេញព័ត៌មានចុះឈ្មោះភ្ញៀវ</span>
                    </h2>
                    <p className="text-xs text-stone-500 mt-1">សូមបំពេញព័ត៌មានខាងក្រោមដោយប្រុងប្រយ័ត្ន</p>
                  </div>

                  {/* Program Wedding Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700">
                      ជ្រើសរើសកម្មវិធីមង្គលការ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedWeddingId}
                      onChange={(e) => setSelectedWeddingId(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-rose-500 focus:border-rose-500 focus:outline-none transition bg-white"
                      required
                    >
                      {weddings.length === 0 ? (
                        <option value="">-- គ្មានកម្មវិធីមង្គលការ (Sandbox Mode) --</option>
                      ) : (
                        weddings.map(w => (
                          <option key={w.id} value={w.id}>{w.title}</option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Row Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-stone-700">
                        ឈ្មោះភ្ញៀវកិត្តិយស <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="ឧទាហរណ៍៖ អ៊ុំ សុខា"
                        className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-rose-500 focus:border-rose-500 focus:outline-none transition"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-stone-700">លេខទូរស័ព្ទ</label>
                      <input
                        type="text"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="ឧទាហរណ៍៖ 012345678"
                        className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-rose-500 focus:border-rose-500 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Row Relation & Companions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-stone-700">
                        ប្រភេទទំនាក់ទំនង <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['ខាងកូនកំលោះ', 'ខាងកូនក្រមុំ', 'មិត្តភក្តិ', 'ផ្សេងៗ'].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setGuestRelation(r)}
                            className={`py-2 px-3 border text-xs font-semibold rounded-lg text-center transition ${
                              guestRelation === r
                                ? 'border-rose-500 bg-rose-50 text-rose-600 font-bold'
                                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-stone-700">ចំនួនអ្នកមកជាមួយ (នាក់)</label>
                      <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => setGuestCompanions(Math.max(0, guestCompanions - 1))}
                          className="px-4 py-3 text-stone-500 hover:bg-stone-50 text-base font-bold transition border-r border-stone-200"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-bold text-stone-800 text-sm">{guestCompanions}</span>
                        <button
                          type="button"
                          onClick={() => setGuestCompanions(guestCompanions + 1)}
                          className="px-4 py-3 text-stone-500 hover:bg-stone-50 text-base font-bold transition border-l border-stone-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Gift Money USD */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700">
                      ចំនួនប្រាក់ចងដៃជាដុល្លារ (USD) - បំពេញ ០ ប្រសិនបើមិនចងដៃពេលនេះ
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                        <DollarSign className="w-5 h-5 text-stone-400" />
                      </div>
                      <input
                        type="number"
                        value={guestAmount}
                        onChange={(e) => setGuestAmount(e.target.value)}
                        placeholder="ឧទាហរណ៍៖ 50"
                        min="0"
                        className="w-full border border-stone-300 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-rose-500 focus:border-rose-500 focus:outline-none transition font-medium"
                      />
                    </div>
                  </div>

                  {/* Notes & Wishes */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700">កំណត់សម្គាល់ ឬសេចក្តីជូនពរ</label>
                    <textarea
                      value={guestNote}
                      onChange={(e) => setGuestNote(e.target.value)}
                      placeholder="សរសេរសេចក្តីជូនពររបស់អ្នកទៅកាន់កូនប្រុសស្រីនៅទីនេះ..."
                      rows={3}
                      className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-rose-500 focus:border-rose-500 focus:outline-none transition leading-relaxed"
                    ></textarea>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isFormSubmitting}
                    className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-rose-600/10 hover:shadow-lg transition flex items-center justify-center gap-2 mt-4"
                  >
                    <span>
                      {isFormSubmitting ? 'កំពុងរក្សាទុកទិន្នន័យ...' : 'ចុះឈ្មោះ និងបញ្ជូនព័ត៌មាន'}
                    </span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: ADMIN VIEW (COORDINATOR DASHBOARD) */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {!isAdminLoggedIn ? (
              /* Coordinator Login Overlay */
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-md">
                <div className="text-center space-y-3 pb-6 border-b border-stone-100">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-stone-800">ផ្ទាំងចូលគណនីអ្នកសម្របសម្រួល</h2>
                  <p className="text-xs text-stone-500">គណនីសាកល្បងលំនាំដើម៖ admin123 លេខសម្ងាត់៖ password123</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4 pt-6">
                  {adminLoginError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{adminLoginError}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">ឈ្មោះគណនី (Username)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="បញ្ចូលឈ្មោះគណនីសម្របសម្រួល"
                        className="w-full text-xs border border-stone-200 rounded-xl pl-9 pr-4 py-3 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">លេខសម្ងាត់ (Password)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="បញ្ចូលលេខសម្ងាត់"
                        className="w-full text-xs border border-stone-200 rounded-xl pl-9 pr-4 py-3 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-xl shadow transition text-xs select-none"
                  >
                    ចូលគណនីគ្រប់គ្រង
                  </button>
                </form>
              </div>
            ) : (
              /* Authorized Admin Workspace Dashboard */
              <div className="space-y-6">
                
                {/* Dashboard top Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900">គណនីអ្នកសម្របសម្រួល</h3>
                      <p className="text-[10px] text-stone-500">មានសិទ្ធចុះឈ្មោះ អនុម័ត និងលុបទិន្នន័យ</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadDatabase}
                      className="text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                    >
                      🔄 ផ្ទុកទិន្នន័យឡើងវិញ
                    </button>
                    <button
                      onClick={() => setIsAdminLoggedIn(false)}
                      className="text-rose-600 hover:bg-rose-50 border border-rose-100 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>ចាកចេញ</span>
                    </button>
                  </div>
                </div>

                {/* Grid for Administration functions */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left Column: Switch/Create Weddings & Manual Input Guest */}
                  <div className="md:col-span-5 space-y-6">
                    
                    {/* Event Select Wedding Panel */}
                    <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm space-y-3.5">
                      <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        កម្មវិធីមង្គលការកំពុងគ្រប់គ្រង
                      </h4>
                      <select
                        value={adminSelectedWeddingId}
                        onChange={(e) => setAdminSelectedWeddingId(e.target.value)}
                        className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none transition bg-white"
                      >
                        {weddings.map(w => (
                          <option key={w.id} value={w.id}>{w.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Create New Wedding Event */}
                    <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                      <div className="border-b border-stone-100 pb-3">
                        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-rose-500" />
                          <span>បង្កើតកម្មវិធីមង្គលការថ្មី</span>
                        </h4>
                      </div>

                      {weddingAddMessage.text && (
                        <div className={`p-3 rounded-xl text-xs font-medium border ${
                          weddingAddMessage.type === 'success' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                            : 'bg-rose-50 border-rose-100 text-rose-600'
                        }`}>
                          {weddingAddMessage.text}
                        </div>
                      )}

                      <form onSubmit={handleCreateWedding} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600 block">ចងចំណងជើងមង្គលការ *</label>
                          <input
                            type="text"
                            value={newWeddingTitle}
                            onChange={(e) => setNewWeddingTitle(e.target.value)}
                            placeholder="ឧទាហរណ៍៖ មង្គលការ សុខា & ចិត្រា"
                            className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-600 block">Host Username *</label>
                            <input
                              type="text"
                              value={newWeddingHostUser}
                              onChange={(e) => setNewWeddingHostUser(e.target.value)}
                              placeholder="ម្ចាស់ការគណនី"
                              className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-600 block">Host Password *</label>
                            <input
                              type="text"
                              value={newWeddingHostPass}
                              onChange={(e) => setNewWeddingHostPass(e.target.value)}
                              placeholder="លេខសម្ងាត់"
                              className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600 block">ImgBB KHQR Link (URL)</label>
                          <input
                            type="url"
                            value={newWeddingKhqrUrl}
                            onChange={(e) => setNewWeddingKhqrUrl(e.target.value)}
                            placeholder="https://i.ibb.co/..."
                            className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-xl transition text-xs shadow-sm mt-1"
                        >
                          រក្សាទុកមង្គលការ
                        </button>
                      </form>
                    </div>

                    {/* Coordinator manually signs up a guest */}
                    <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                      <div className="border-b border-stone-100 pb-3">
                        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4 text-rose-500" />
                          <span>ចុះឈ្មោះភ្ញៀវផ្ទាល់នៅតុស្វាគមន៍</span>
                        </h4>
                      </div>

                      <form onSubmit={handleAdminAddGuest} className="space-y-3">
                        <div className="space-y-1 font-sans">
                          <label className="text-[10px] font-bold text-stone-600 block">ឈ្មោះភ្ញៀវ *</label>
                          <input
                            type="text"
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            placeholder="បញ្ចូលឈ្មោះភ្ញៀវ"
                            className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                            required
                          />
                        </div>

                        <div className="space-y-1 font-sans">
                          <label className="text-[10px] font-bold text-stone-600 block">លេខទូរស័ព្ទ</label>
                          <input
                            type="text"
                            value={manualPhone}
                            onChange={(e) => setManualPhone(e.target.value)}
                            placeholder="បញ្ចូលលេខទូរស័ព្ទ"
                            className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-600 block">អ្នកមកជាមួយ (នាក់)</label>
                            <input
                              type="number"
                              value={manualCompanions}
                              onChange={(e) => setManualCompanions(Math.max(0, parseInt(e.target.value) || 0))}
                              min="0"
                              className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-600 block">ប្រាក់ចងដៃ (USD)</label>
                            <input
                              type="number"
                              value={manualAmount}
                              onChange={(e) => setManualAmount(e.target.value)}
                              placeholder="ឧ៖ 50"
                              min="0"
                              className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:outline-none transition font-medium"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600 block">ប្រភេទទំនាក់ទំនង</label>
                          <select
                            value={manualRelation}
                            onChange={(e) => setManualRelation(e.target.value)}
                            className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:outline-none transition bg-white"
                          >
                            <option value="ខាងកូនកំលោះ">ខាងកូនកំលោះ</option>
                            <option value="ខាងកូនក្រមុំ">ខាងកូនក្រមុំ</option>
                            <option value="មិត្តភក្តិ">មិត្តភក្តិ</option>
                            <option value="ផ្សេងៗ">ផ្សេងៗ</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600 block">កំណត់សម្គាល់</label>
                          <input
                            type="text"
                            value={manualNote}
                            onChange={(e) => setManualNote(e.target.value)}
                            placeholder="ចងដៃមុនការ ឬ wishes"
                            className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-2.5 px-3 rounded-xl transition text-xs shadow-sm mt-1"
                        >
                          រក្សាទុកភ្ញៀវភ្លាមៗ
                        </button>
                      </form>
                    </div>

                  </div>

                  {/* Right Column: Register Guest approvals table view */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
                      
                      <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50/50">
                        <div>
                          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                            បញ្ជីភ្ញៀវរង់ចាំការពិនិត្យដោះស្រាយគណនី
                          </h4>
                          <span className="text-[10px] text-stone-500 block mt-0.5">
                            កម្មវិធី៖ {currentAdminWeddingDetails ? currentAdminWeddingDetails.title : 'គ្មាន'}
                          </span>
                        </div>
                        
                        {/* Search in Guest list */}
                        <div className="relative max-w-xs">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-stone-400">
                            <Search className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="text"
                            value={adminGuestSearch}
                            onChange={(e) => setAdminGuestSearch(e.target.value)}
                            placeholder="ស្វែងរកឈ្មោះ ឬលេខទូរស័ព្ទ..."
                            className="text-xs border border-stone-200 rounded-xl pl-8 pr-3 py-2 focus:ring-1 focus:ring-rose-500 focus:outline-none transition bg-white w-full"
                          />
                        </div>
                      </div>

                      {/* Responsive list of guests registration approvals list */}
                      <div className="divide-y divide-stone-100 overflow-y-auto max-h-[600px]">
                        {filteredGuestsForAdmin.length === 0 ? (
                          <div className="p-8 text-center text-stone-400 text-xs">
                            <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                            <span>គ្មានបញ្ជីឈ្មោះភ្ញៀវណាដែលត្រូវគ្នានោះឡើយ!</span>
                          </div>
                        ) : (
                          filteredGuestsForAdmin.map((g) => (
                            <div key={g.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 transition duration-150">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-stone-800 text-sm">{g.name}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    g.relation_type === 'ខាងកូនកំលោះ' ? 'bg-sky-50 text-sky-600' :
                                    g.relation_type === 'ខាងកូនក្រមុំ' ? 'bg-rose-50 text-rose-600' :
                                    g.relation_type === 'មិត្តភក្តិ' ? 'bg-amber-50 text-amber-600' : 'bg-stone-100 text-stone-600'
                                  }`}>
                                    {g.relation_type}
                                  </span>
                                  {g.status === 'pending' ? (
                                    <span className="bg-amber-100/80 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-medium border border-amber-200">
                                      រង់ចាំពិនិត្យ
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-100/80 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-medium border border-emerald-200">
                                      បានយល់ព្រម
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                                  <span>📞 {g.phone || 'គ្មានលេខ'}</span>
                                  <span>👥 មកជាមួយ៖ <strong className="text-stone-700">{g.companions} នាក់</strong></span>
                                  <span>ចងដៃ៖ <strong className="text-rose-600 font-semibold">${g.amount}</strong></span>
                                </div>
                                {g.note && (
                                  <p className="text-[11px] text-stone-600 italic bg-amber-50/20 px-2 py-1 rounded border border-amber-100/50 max-w-md">
                                    💬 {g.note}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-center">
                                {g.status === 'pending' && (
                                  <button
                                    onClick={() => approveGuest(g.id)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm px-2.5"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>យល់ព្រម</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteGuest(g.id)}
                                  className="border border-stone-200 hover:bg-stone-100 hover:text-rose-600 text-stone-500 p-1.5 rounded-lg transition"
                                  title="លុបភ្ញៀវ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* VIEW 3: HOST VIEW (WEDDING OWNER STATISTICS) */}
        {activeTab === 'host' && (
          <div className="space-y-6">
            {!isHostLoggedIn ? (
              /* Host Login Authenticator */
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-md">
                <div className="text-center space-y-3 pb-6 border-b border-stone-100">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-stone-800 font-sans">ផ្ទាំងចូលគណនីម្ចាស់ការ (កូនប្រុសស្រី)</h2>
                  <p className="text-xs text-stone-500">គណនីសាកល្បង៖ host123 លេខសម្ងាត់៖ password123</p>
                </div>

                <form onSubmit={handleHostLogin} className="space-y-4 pt-6">
                  {hostLoginError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{hostLoginError}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">គណនីម្ចាស់ការ (Host Username)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={hostUsername}
                        onChange={(e) => setHostUsername(e.target.value)}
                        placeholder="បញ្ចូលគណនីម្ចាស់ការ"
                        className="w-full text-xs border border-stone-200 rounded-xl pl-9 pr-4 py-3 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">លេខសម្ងាត់ (Password)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        value={hostPassword}
                        onChange={(e) => setHostPassword(e.target.value)}
                        placeholder="បញ្ចូលលេខសម្ងាត់"
                        className="w-full text-xs border border-stone-200 rounded-xl pl-9 pr-4 py-3 focus:ring-1 focus:ring-rose-500 focus:outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl shadow transition text-xs"
                  >
                    ចូលគណនីមើលរបាយការណ៍
                  </button>
                </form>
              </div>
            ) : (
              /* Authorized Host Analytics Dashboard */
              <div className="space-y-6">
                
                {/* Host session controller header design */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                      <Heart className="w-4 h-4 fill-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900">{hostLoggedWedding?.title}</h3>
                      <p className="text-[10px] text-stone-500">សិទ្ធិមើលសរុប និងរបាយការណ៍ហិរញ្ញវត្ថុចងដៃ</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportToExcel}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>នាំចេញបញ្ជីទៅ Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsHostLoggedIn(false);
                        setHostLoggedWedding(null);
                      }}
                      className="text-stone-600 hover:bg-stone-50 border border-stone-200 py-1.5 px-3 rounded-lg text-xs font-semibold transition"
                    >
                      ចាកចេញ
                    </button>
                  </div>
                </div>

                {/* 3 Styled Scientific Cards for Wedding Analytics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  
                  {/* Stats 1: Total registered Guests */}
                  <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-2">
                      <span className="text-xs text-stone-500 font-bold block">ភ្ញៀវដែលបានចុះឈ្មោះកក់ទុក</span>
                      <strong className="text-3xl font-black text-stone-800 block">
                        {hostStats.totalRegistered} <span className="text-xs font-normal text-stone-400">នាក់</span>
                      </strong>
                    </div>
                    <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-sky-500">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="absolute top-0 inset-x-0 h-1 bg-sky-400"></div>
                  </div>

                  {/* Stats 2: Actual Total attendees (approved guests + companions) */}
                  <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-2">
                      <span className="text-xs text-stone-500 font-bold block">វត្តមានជាក់ស្តែង (បានអនុម័ត)</span>
                      <strong className="text-3xl font-black text-stone-800 block">
                        {hostStats.totalAttendees} <span className="text-xs font-normal text-stone-400">នាក់</span>
                      </strong>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500"></div>
                  </div>

                  {/* Stats 3: Total Gift Money USD amount */}
                  <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-2">
                      <span className="text-xs text-stone-500 font-bold block">ថវិការចងដៃសរុបទទួលបាន</span>
                      <strong className="text-3xl font-black text-rose-600 block">
                        ${hostStats.totalGiftAmount.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-rose-400">USD</span>
                      </strong>
                    </div>
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div className="absolute top-0 inset-x-0 h-1 bg-rose-500"></div>
                  </div>

                </div>

                {/* Host view detailed logs list and searching block */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                  
                  <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50/50">
                    <div>
                      <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        តារាងបញ្ជីឈ្មោះភ្ញៀវ និងប្រាក់ចងដៃទាំងអស់
                      </h4>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        បង្ហាញសម្រាប់កម្មវិធីមង្គលការជាក់លាក់
                      </p>
                    </div>

                    <div className="relative max-w-xs">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-stone-400">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        value={hostGuestSearch}
                        onChange={(e) => setHostGuestSearch(e.target.value)}
                        placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខទូរស័ព្ទ..."
                        className="text-xs border border-stone-200 rounded-xl pl-8 pr-3 py-2 focus:ring-1 focus:ring-rose-500 focus:outline-none transition bg-white w-full"
                      />
                    </div>
                  </div>

                  {/* Mobile responsive view logs table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-stone-600">
                      <thead className="text-[10px] uppercase font-bold text-stone-500 border-b border-stone-100 bg-stone-50/30">
                        <tr>
                          <th className="py-3 px-4 font-bold text-center">ល.រ</th>
                          <th className="py-3 px-4 font-bold">ឈ្មោះភ្ញៀវកិត្តិយស</th>
                          <th className="py-3 px-4 font-bold">លេខទូរស័ព្ទ</th>
                          <th className="py-3 px-4 font-bold text-center">អ្នកមកជាមួយ</th>
                          <th className="py-3 px-4 font-bold">ទំនាក់ទំនង</th>
                          <th className="py-3 px-4 font-bold text-right">ប្រាក់ចងដៃ (USD)</th>
                          <th className="py-3 px-4 font-bold">កំណត់សម្គាល់/ពាក្យជូនពរ</th>
                          <th className="py-3 px-4 font-bold text-center">ស្ថានភាព</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredGuestsForHost.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-stone-400">
                              គ្មានទិន្នន័យដើម្បីបង្ហាញទេ
                            </td>
                          </tr>
                        ) : (
                          filteredGuestsForHost.map((g, index) => (
                            <tr key={g.id} className="hover:bg-stone-50/50 transition duration-150">
                              <td className="py-3.5 px-4 text-center font-bold text-stone-400">{index + 1}</td>
                              <td className="py-3.5 px-4 font-bold text-stone-800">{g.name}</td>
                              <td className="py-3.5 px-4 font-mono">{g.phone || '-'}</td>
                              <td className="py-3.5 px-4 text-center font-semibold text-stone-700">+{g.companions} នាក់</td>
                              <td className="py-3.5 px-4">
                                <span className="py-0.5 px-2 rounded-full text-[9px] font-semibold bg-stone-100 text-stone-700">
                                  {g.relation_type}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-rose-600">${g.amount.toLocaleString()}</td>
                              <td className="py-3.5 px-4 text-stone-500 max-w-xs truncate" title={g.note}>{g.note || '-'}</td>
                              <td className="py-3.5 px-4 text-center">
                                {g.status === 'approved' ? (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-100 inline-block">
                                    យល់ព្រម
                                  </span>
                                ) : (
                                  <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-100 inline-block">
                                    រង់ចាំពិនិត្យ
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* Decorative floral footer credit indicators */}
      <footer className="w-full text-center mt-12 py-6 border-t border-stone-200 max-w-4xl mx-auto text-[11px] text-stone-400 leading-relaxed font-sans px-4">
        <p>© ២០២៦ ប្រព័ន្ធរៀបចំមង្គលការឌីជីថល សម្រាប់គ្រប់គ្រងភ្ញៀវ។ រក្សាសិទ្ធគ្រប់យ៉ាង។</p>
        <p className="mt-1 text-stone-400/80">
          ស្រទាប់រូបភាពស្អាតៗ និងការកំណត់ API Supabase are isolated inside current playground context.
        </p>
      </footer>
    </div>
  );
}
