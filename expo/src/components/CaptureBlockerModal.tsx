import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

export function CaptureBlockerModal({
  visible,
  onClose,
}: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>El contenido está diseñado para vivirse, no para compartirse.</Text>
          <Text style={s.msg}>
            Prefiero que no grabes.
            Seguro lo entiendes.
          </Text>
          <Pressable onPress={onClose} style={s.btn}>
            <Text style={s.btnTxt}>Gracias</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.55)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  card: { 
    width: '86%', 
    borderRadius: 16, 
    padding: 18, 
    backgroundColor: '#111', 
    gap: 10 
  },
  title: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#fff' 
  },
  msg: { 
    fontSize: 14, 
    color: '#ddd' 
  },
  btn: { 
    marginTop: 8, 
    alignSelf: 'flex-end', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    backgroundColor: '#444', 
    borderRadius: 10 
  },
  btnTxt: { 
    color: '#fff', 
    fontWeight: '600' 
  },
});