import * as Y from 'yjs';
import {
  applyCollaborativeUpdate,
  createCollaborativeDocument,
  encodeCollaborativeDocument,
  materializeCollaborativeDocument,
  parseCollaborativePackEnvelope,
  updateCollaborativeDocument,
} from '../../utils/collaborative-packs';

const timestamp = '2026-08-12T10:00:00.000Z';
const baseStyles = {
  'example.com': {
    css: '.card {\n  color: black;\n}\n',
    enabled: true,
    readability: false,
    modifiedTime: timestamp,
  },
};

describe('Yjs collaborative style packs', () => {
  it('converges independent CSS edits without replacing the whole pack', () => {
    const base = createCollaborativeDocument('pack-1', 'Shared pack', baseStyles);
    const baseUpdate = encodeCollaborativeDocument(base);
    const alice = new Y.Doc();
    const bob = new Y.Doc();
    applyCollaborativeUpdate(alice, baseUpdate);
    applyCollaborativeUpdate(bob, baseUpdate);

    updateCollaborativeDocument(alice, {
      'example.com': {
        ...baseStyles['example.com'],
        css: '.card {\n  color: navy;\n}\n',
      },
    });
    updateCollaborativeDocument(bob, {
      'example.com': {
        ...baseStyles['example.com'],
        css: '.card {\n  color: black;\n  background: white;\n}\n',
      },
    });

    const aliceUpdate = encodeCollaborativeDocument(alice);
    const bobUpdate = encodeCollaborativeDocument(bob);
    applyCollaborativeUpdate(alice, bobUpdate);
    applyCollaborativeUpdate(bob, aliceUpdate);
    const aliceCss = materializeCollaborativeDocument(alice).styles[
      'example.com'
    ].css;
    const bobCss = materializeCollaborativeDocument(bob).styles['example.com'].css;

    expect(aliceCss).toBe(bobCss);
    expect(aliceCss).toContain('color: navy');
    expect(aliceCss).toContain('background: white');
  });

  it('validates the versioned update envelope and embedded identity', () => {
    const doc = createCollaborativeDocument('pack-1', 'Shared pack', baseStyles);
    expect(
      parseCollaborativePackEnvelope({
        version: 1,
        app: 'StyleKit',
        kind: 'collaborative-style-pack',
        exportedAt: timestamp,
        pack: { id: 'pack-1', name: 'Shared pack' },
        update: encodeCollaborativeDocument(doc),
      }).pack.name
    ).toBe('Shared pack');
    expect(() =>
      parseCollaborativePackEnvelope({
        version: 1,
        app: 'StyleKit',
        kind: 'collaborative-style-pack',
        exportedAt: timestamp,
        pack: { id: 'different-pack', name: 'Shared pack' },
        update: encodeCollaborativeDocument(doc),
      })
    ).toThrow('identity');
  });
});
