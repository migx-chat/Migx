
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { MIG33_CMD, CmdKey } from '@/utils/cmdMapping';

interface CmdListProps {
  visible: boolean;
  onClose: () => void;
  onSelectCmd: (cmdKey: string, requiresTarget: boolean) => void;
}

export function CmdList({ visible, onClose, onSelectCmd }: CmdListProps) {
  const { theme } = useThemeCustom();
  const [searchQuery, setSearchQuery] = React.useState('');

  const cmdEntries = Object.entries(MIG33_CMD) as [CmdKey, typeof MIG33_CMD[CmdKey]][];

  const filteredCmds = cmdEntries.filter(([key]) =>
    key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCmd = (cmdKey: string, requiresTarget: boolean) => {
    onSelectCmd(cmdKey, requiresTarget);
    onClose();
    setSearchQuery('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>CMD List</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Search cmd..."
              placeholderTextColor={theme.text + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView style={styles.listContainer}>
            {filteredCmds.map(([key, value]) => (
              <TouchableOpacity
                key={key}
                style={[styles.cmdItem, { borderBottomColor: theme.border }]}
                onPress={() => handleSelectCmd(key, value.requiresTarget)}
              >
                <View style={styles.cmdContent}>
                  <Text style={[styles.cmdName, { color: theme.text }]}>
                    /{key}
                  </Text>
                  {value.requiresTarget && (
                    <Text style={[styles.targetBadge, { color: '#10b981' }]}>
                      +target
                    </Text>
                  )}
                </View>
                <Text style={[styles.cmdDescription, { color: theme.text + 'CC' }]}>
                  {value.message('You', 'someone')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  searchContainer: {
    padding: 12,
  },
  searchInput: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  listContainer: {
    maxHeight: 500,
  },
  cmdItem: {
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  cmdContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cmdName: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  cmdDescription: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
