import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

interface Business {
  id: number;
  name: string;
  address: string;
  phone: string;
  lat?: number;
  lng?: number;
  contacts: Contact[];
}

interface Contact {
  id: number;
  name: string;
  title: string;
  phone: string;
  email?: string;
  notes: Note[];
}

interface Note {
  id: number;
  text: string;
  created_at: string;
}

const BusinessDetailsScreen = ({ route, navigation }: any) => {
  const { businessId } = route.params;
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinessDetails();
  }, [businessId]);

  const fetchBusinessDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/businesses/${businessId}/full`);
      setBusiness(response.data);
    } catch (error) {
      console.error('Error fetching business details:', error);
      Alert.alert('Error', 'Failed to load business details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = (contactId: number) => {
    navigation.navigate('AddNote', { contactId, businessId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading business details...</Text>
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Business not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.businessName}>{business.name}</Text>
        <Text style={styles.businessAddress}>{business.address}</Text>
        <Text style={styles.businessPhone}>{business.phone}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contacts</Text>
        {business.contacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactTitle}>{contact.title}</Text>
            </View>
            
            <View style={styles.contactInfo}>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
              {contact.email && (
                <Text style={styles.contactEmail}>{contact.email}</Text>
              )}
            </View>

            <View style={styles.notesSection}>
              <View style={styles.notesHeader}>
                <Text style={styles.notesTitle}>Notes</Text>
                <TouchableOpacity
                  onPress={() => handleAddNote(contact.id)}
                  style={styles.addNoteButton}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {contact.notes.length === 0 ? (
                <Text style={styles.noNotesText}>No notes yet</Text>
              ) : (
                contact.notes.map((note) => (
                  <View key={note.id} style={styles.noteItem}>
                    <Text style={styles.noteText}>{note.text}</Text>
                    <Text style={styles.noteDate}>
                      {new Date(note.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  businessAddress: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  businessPhone: {
    fontSize: 16,
    color: '#007AFF',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactHeader: {
    marginBottom: 12,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  contactTitle: {
    fontSize: 14,
    color: '#666',
  },
  contactInfo: {
    marginBottom: 16,
  },
  contactPhone: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#666',
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addNoteButton: {
    padding: 4,
  },
  noNotesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  noteItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 12,
    color: '#666',
  },
});

export default BusinessDetailsScreen; 