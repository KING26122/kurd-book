import { useState } from 'react';
import { cn } from '@/lib/cn';

const CATEGORIES: Array<{ id: string; label: string; icon: string; emojis: string[] }> = [
  {
    id: 'smileys',
    label: 'ڕووخۆشەکان',
    icon: '😀',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  },
  {
    id: 'hearts',
    label: 'دڵ و هەست',
    icon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💌','💋','👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🫶','🫂'],
  },
  {
    id: 'kurdish',
    label: 'کوردستان',
    icon: '🏔️',
    emojis: ['☀️','🏔️','⛰️','🌄','🌅','🌇','🌿','🍃','🌾','🌻','🌼','🌷','🕊️','🦅','🐐','🐑','🐎','☕','🫖','🍵','🍇','🍉','🍑','🍎','🍐','🥜','🍯','🧆','🍚','🍞','🎶','🎻','🪕','🥁','📻','🎙️','📖','✍️','🕌','🕋','🌙','⭐','✨','👑','💎','🔒','🛡️','🏳️','🎉','🎊','🎁','🪄'],
  },
  {
    id: 'nature',
    label: 'سروشت',
    icon: '🌿',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪲','🦋','🐌','🐞','🐢','🐍','🦎','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🦈','🐊','🐅','🐆','🦓','🦍','🐘','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🪶','🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂','🍁','🌾','🌺','🌻','🌹','🥀','🌷','🌼','🌸','💐','🍄','🌰','🎃'],
  },
  {
    id: 'food',
    label: 'خواردن',
    icon: '🍽️',
    emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰'],
  },
  {
    id: 'symbols',
    label: 'هێماکان',
    icon: '✨',
    emojis: ['✅','☑️','✔️','❌','❎','⭕','🚫','💯','💢','💥','💫','💦','💨','🕳️','💬','🗨️','🗯️','💭','💤','🔥','🌪️','🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💧','💦','🌊','🎉','🎊','🎈','🎁','🎀','🪄','🎇','🎆','✨','🌟','⭐','🌠','🌌','🔔','🔕','🎵','🎶','🎼','🎤','🎧','🎷','🎸','🎹','🎺','🎻','🪕','🥁','📱','💻','⌨️','🖥️','🖨️','🕹️','💡','🔦','📷','📸','📹','🎥','📺','📻','🔒','🔓','🔐','🔑','🗝️','🛡️','⚔️','🏹','🪓','🔮','🧿','📿','💈','⚗️','🔭','🔬','🩺','💊','🩹'],
  },
];

const STICKERS = ['👑✨','💎🔥','🏔️❤️','🌙🕊️','☕😌','🎉🥳','🦅🇹🇯','💪😎','🙏🤍','🌿✨','🔒👀','🎶🌊','☀️🏔️','🍓😋','🫶🏼','🤝🏔️','🎙️⭐','🌹💫','🦁👑','🪄💫'];

export function EmojiPicker({
  onEmoji,
  onSticker,
  className,
}: {
  onEmoji: (emoji: string) => void;
  onSticker?: (sticker: string) => void;
  className?: string;
}) {
  const [category, setCategory] = useState(CATEGORIES[0]!.id);
  const active = CATEGORIES.find((item) => item.id === category) || CATEGORIES[0]!;
  const [tab, setTab] = useState<'emoji' | 'sticker'>('emoji');

  return (
    <div className={cn('flex h-[320px] w-[min(88vw,356px)] flex-col overflow-hidden rounded-3xl border border-line bg-[color:var(--surface-solid)] shadow-2xl', className)}>
      <div className="flex border-b border-line p-1.5">
        <button type="button" onClick={() => setTab('emoji')} className={cn('flex-1 rounded-xl py-2 text-[11px] font-bold', tab === 'emoji' ? 'bg-[color:var(--surface-2)] text-ink' : 'text-muted')}>
          😊 ئیمۆجی
        </button>
        <button type="button" onClick={() => setTab('sticker')} className={cn('flex-1 rounded-xl py-2 text-[11px] font-bold', tab === 'sticker' ? 'bg-[color:var(--surface-2)] text-ink' : 'text-muted')}>
          ✨ ستیکەر
        </button>
      </div>

      {tab === 'emoji' ? (
        <>
          <div className="flex border-b border-line px-1 py-1">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => setCategory(item.id)}
                className={cn('flex-1 rounded-xl py-1.5 text-base transition-transform hover:scale-125', category === item.id && 'bg-[color:var(--surface-2)]')}
              >
                {item.icon}
              </button>
            ))}
          </div>
          <div className="emoji-grid hide-scrollbar grid flex-1 grid-cols-8 content-start gap-1 overflow-y-auto p-2">
            {active.emojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                type="button"
                className="flex h-9 items-center justify-center rounded-lg text-xl"
                onClick={() => onEmoji(emoji)}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="hide-scrollbar grid flex-1 grid-cols-4 content-start gap-2 overflow-y-auto p-3">
          {STICKERS.map((sticker) => (
            <button
              key={sticker}
              type="button"
              onClick={() => onSticker?.(sticker)}
              className="sticker-wiggle flex aspect-square items-center justify-center rounded-2xl bg-[color:var(--surface-2)] text-2xl transition-all hover:scale-105 hover:bg-[color:var(--surface-3)]"
              title="ناردنی ستیکەر"
            >
              {sticker}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
