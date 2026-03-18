/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { ArrowDown, ArrowUp, Play, Pause, RotateCcw, Volume2, VolumeX, Settings2, Info, Music, ChevronDown, User } from 'lucide-react';

// Rhythm Patterns
const RHYTHM_PATTERNS: Record<string, { time: number; direction: string; label: string; isSilent?: boolean }[]> = {
  "Pop Rock": [
    { time: 0, direction: 'down', label: '1' },
    { time: 1, direction: 'down', label: '2' },
    { time: 1.5, direction: 'up', label: '&' },
    { time: 2.5, direction: 'up', label: '&' },
    { time: 3, direction: 'down', label: '4' },
  ],
  "Pop Lento": [
    { time: 0, direction: 'down', label: '1' },
    { time: 0.25, direction: 'up', label: '2', isSilent: true },
    { time: 0.5, direction: 'down', label: '3', isSilent: true },
    { time: 0.75, direction: 'up', label: '4', isSilent: true },
    { time: 1, direction: 'down', label: '5' },
    { time: 1.25, direction: 'up', label: '6', isSilent: true },
    { time: 1.5, direction: 'down', label: '7', isSilent: true },
    { time: 1.75, direction: 'up', label: '8' },
    { time: 2, direction: 'down', label: '9', isSilent: true },
    { time: 2.25, direction: 'up', label: '10' },
    { time: 2.5, direction: 'down', label: '11' },
    { time: 2.75, direction: 'up', label: '12', isSilent: true },
    { time: 3, direction: 'down', label: '13' },
    { time: 3.25, direction: 'up', label: '14', isSilent: true },
    { time: 3.5, direction: 'down', label: '15', isSilent: true },
    { time: 3.75, direction: 'up', label: '16', isSilent: true },
  ]
};

// Chord Definitions
const CHORDS_DATA: Record<string, string[]> = {
  "C Major": ["C3", "E3", "G3", "C4", "E4"],
  "D Major": ["D3", "A3", "D4", "Gb4"],
  "E Major": ["E2", "B2", "E3", "Ab3", "B3", "E4"],
  "F Major": ["F2", "C3", "F3", "A3", "C4", "F4"],
  "G Major": ["G2", "B2", "D3", "G3", "B3", "G4"],
  "A Major": ["A2", "E3", "A3", "Db4", "E4"],
  "B Major": ["B2", "Gb3", "B3", "Eb4", "Gb4"],
  "C Minor": ["C3", "Eb3", "G3", "C4", "Eb4"],
  "D Minor": ["D3", "A3", "D4", "F4"],
  "E Minor": ["E2", "B2", "E3", "G3", "B3", "E4"],
  "F Minor": ["F2", "C3", "F3", "Ab3", "C4", "F4"],
  "G Minor": ["G2", "D3", "G3", "Bb3", "D4", "G4"],
  "A Minor": ["A2", "E3", "A3", "C4", "E4"],
  "B Minor": ["B2", "Gb3", "B3", "D4", "Gb4"],
};

// Map short chord names to full names used in CHORDS_DATA
const CHORD_MAP: Record<string, string> = {
  "C": "C Major", "D": "D Major", "E": "E Major", "F": "F Major", "G": "G Major", "A": "A Major", "B": "B Major",
  "Cm": "C Minor", "Dm": "D Minor", "Em": "E Minor", "Fm": "F Minor", "Gm": "G Minor", "Am": "A Minor", "Bm": "B Minor",
};

// Chord Fingerings (E A D G B E)
const CHORD_DIAGRAMS: Record<string, (number | string)[]> = {
  "C Major": ["x", 3, 2, 0, 1, 0],
  "D Major": ["x", "x", 0, 2, 3, 2],
  "E Major": [0, 2, 2, 1, 0, 0],
  "F Major": [1, 3, 3, 2, 1, 1],
  "G Major": [3, 2, 0, 0, 0, 3],
  "A Major": ["x", 0, 2, 2, 2, 0],
  "B Major": ["x", 2, 4, 4, 4, 2],
  "C Minor": ["x", 3, 5, 5, 4, 3],
  "D Minor": ["x", "x", 0, 2, 3, 1],
  "E Minor": [0, 2, 2, 0, 0, 0],
  "F Minor": [1, 3, 3, 1, 1, 1],
  "G Minor": [3, 5, 5, 3, 3, 3],
  "A Minor": ["x", 0, 2, 2, 1, 0],
  "B Minor": ["x", 2, 4, 4, 3, 2],
};

// Sample URLs for realistic acoustic guitar
const SAMPLES_BASE_URL = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FluidR3_GM/acoustic_guitar_nylon-mp3/";
// Expanded samples for better interpolation across all chords
const GUITAR_SAMPLES = {
  "E2": "E2.mp3", "G2": "G2.mp3", "A2": "A2.mp3", "B2": "B2.mp3",
  "C3": "C3.mp3", "D3": "D3.mp3", "E3": "E3.mp3", "F3": "F3.mp3", "G3": "G3.mp3", "A3": "A3.mp3", "B3": "B3.mp3",
  "C4": "C4.mp3", "D4": "D4.mp3", "E4": "E4.mp3", "F4": "F4.mp3", "G4": "G4.mp3", "A4": "A4.mp3", "B4": "B4.mp3"
};

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [activeArrowIndex, setActiveArrowIndex] = useState(-1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedChord, setSelectedChord] = useState("G Major");
  const [selectedRhythm, setSelectedRhythm] = useState("Pop Lento");
  const [isChordDropdownOpen, setIsChordDropdownOpen] = useState(false);
  const [isRhythmDropdownOpen, setIsRhythmDropdownOpen] = useState(false);
  const [songInput, setSongInput] = useState("| G | C | D | G |");
  const [songStructure, setSongStructure] = useState<string[]>(["G Major", "C Major", "D Major", "G Major"]);
  const [currentMeasureIndex, setCurrentMeasureIndex] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 1 within a measure
  
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize audio chain with high-quality effects
    const reverb = new Tone.Reverb({
      decay: 3,
      preDelay: 0.02,
      wet: 0.25
    }).toDestination();

    const compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 3,
      attack: 0.01,
      release: 0.2
    }).connect(reverb);

    const sampler = new Tone.Sampler({
      urls: GUITAR_SAMPLES,
      baseUrl: SAMPLES_BASE_URL,
      onload: () => setIsLoaded(true),
    }).connect(compressor);
    
    samplerRef.current = sampler;

    return () => {
      sampler.dispose();
      reverb.dispose();
      compressor.dispose();
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    if (samplerRef.current) {
      samplerRef.current.volume.value = isMuted ? -Infinity : -4;
    }
  }, [isMuted]);

  useEffect(() => {
    // Parse song input whenever it changes
    const chords = songInput
      .split('|')
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(s => CHORD_MAP[s] || "G Major");
    
    if (chords.length > 0) {
      setSongStructure(chords);
    }
  }, [songInput]);

  useEffect(() => {
    if (timelineRef.current && isPlaying) {
      const container = timelineRef.current;
      const activeMeasure = container.querySelector(`[data-measure-index="${currentMeasureIndex}"]`) as HTMLElement;
      if (activeMeasure) {
        const containerWidth = container.offsetWidth;
        const measureLeft = activeMeasure.offsetLeft;
        const measureWidth = activeMeasure.offsetWidth;
        
        container.scrollTo({
          left: measureLeft - (containerWidth / 2) + (measureWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  }, [currentMeasureIndex, isPlaying]);

  const vibrateStrings = (direction: 'down' | 'up', chordName: string) => {
    // Visual strings removed for a leaner UI
  };

  const strumChord = (chordName: string, direction: 'down' | 'up' = 'down') => {
    if (!samplerRef.current || !isLoaded) return;
    
    const chordNotes = CHORDS_DATA[chordName] || CHORDS_DATA["G Major"];
    const notesToPlay = direction === 'down' ? chordNotes : [...chordNotes].reverse();
    
    const now = Tone.now();
    notesToPlay.forEach((note, i) => {
      const strumOffset = i * 0.025;
      const velocity = direction === 'down' ? 0.75 - (i * 0.05) : 0.55 - (i * 0.05);
      samplerRef.current?.triggerAttackRelease(
        note, 
        '2n', 
        now + strumOffset, 
        Math.max(0.1, velocity)
      );
    });
    vibrateStrings(direction, chordName);
  };

  const startPlayback = async () => {
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }

    Tone.Transport.cancel();
    
    const totalMeasures = songStructure.length;
    
    songStructure.forEach((chordName, mIndex) => {
      RHYTHM_PATTERNS[selectedRhythm].forEach((item, rIndex) => {
        const bars = mIndex;
        const beats = Math.floor(item.time);
        const sixteenths = (item.time % 1) * 4;
        const timeStr = `${bars}:${beats}:${sixteenths}`;

        Tone.Transport.schedule((time) => {
          if (samplerRef.current && isLoaded && !item.isSilent) {
            const isDown = item.direction === 'down';
            const chordNotes = CHORDS_DATA[chordName] || CHORDS_DATA["G Major"];
            const notesToPlay = isDown ? chordNotes : [...chordNotes].reverse();
            
            notesToPlay.forEach((note, i) => {
              const strumOffset = i * 0.02;
              const velocity = isDown ? 0.85 - (i * 0.04) : 0.65 - (i * 0.04);
              const humanize = (Math.random() - 0.5) * 0.005;
              
              samplerRef.current?.triggerAttackRelease(
                note, 
                '2n', 
                time + strumOffset + humanize, 
                Math.max(0.1, velocity)
              );
            });
          }
          
          Tone.Draw.schedule(() => {
            setCurrentMeasureIndex(mIndex);
            setActiveArrowIndex(rIndex);
            vibrateStrings(item.direction as 'down' | 'up', chordName);
            setTimeout(() => setActiveArrowIndex(-1), 150);
          }, time);
        }, timeStr);
      });
    });

    // Progress tracking for cursor
    Tone.Transport.scheduleRepeat((time) => {
      const seconds = Tone.Transport.seconds;
      const bpm = Tone.Transport.bpm.value;
      const secondsPerMeasure = (60 / bpm) * 4;
      const currentM = Math.floor(seconds / secondsPerMeasure) % totalMeasures;
      const progress = (seconds % secondsPerMeasure) / secondsPerMeasure;
      
      Tone.Draw.schedule(() => {
        setPlaybackProgress(progress);
        setCurrentMeasureIndex(currentM);
      }, time);
    }, "32n");

    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = `${totalMeasures}m`;
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    Tone.Transport.stop();
    setIsPlaying(false);
    setActiveArrowIndex(-1);
  };

  const togglePlayback = () => {
    if (!isLoaded) return;
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-[#e0e0e0] font-sans flex flex-col items-center py-8 px-4 sm:px-8 overflow-x-hidden selection:bg-amber-500/30">
      {/* Sophisticated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#1a1a20,transparent)]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center space-y-6">
        {/* Professor Branding Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex flex-col md:flex-row items-center justify-between bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 backdrop-blur-md shadow-2xl"
        >
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/5 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.2),transparent)]" />
                <User size={32} className="text-amber-500 relative z-10" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center border-2 border-[#0c0c0e]">
                <Music size={12} className="text-black" />
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none">
                Professor <span className="text-amber-500">Isael Martins</span>
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Criado por:</span>
                <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">minha logo</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-8">
            <div className="h-12 w-px bg-white/5" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Especialista em</span>
              <span className="text-sm font-black text-white uppercase tracking-widest">Violão Popular</span>
            </div>
          </div>
        </motion.div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {!isLoaded && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#0c0c0e] flex flex-col items-center justify-center space-y-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-zinc-800 border-t-amber-500 animate-spin" />
                <Music className="absolute inset-0 m-auto text-amber-500" size={24} />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-black tracking-tighter text-white uppercase">Initializing Engine</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold mt-2">Loading High-Fidelity Samples</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Hardware Header */}
        <header className="w-full flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-6 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Settings2 size={20} className="text-black" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white">STRUM.LAB <span className="text-amber-500">v2.6</span></h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Professional Rhythm Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Rhythm Selector Dropdown */}
            <div className="relative flex flex-col gap-1">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Batidas e levadas</span>
              <button 
                onClick={() => {
                  setIsRhythmDropdownOpen(!isRhythmDropdownOpen);
                  setIsChordDropdownOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2 bg-zinc-900/80 border border-white/10 rounded-xl hover:bg-zinc-800 transition-all text-xs font-bold text-white uppercase tracking-widest"
              >
                <RotateCcw size={14} className="text-amber-500" />
                {selectedRhythm}
                <ChevronDown size={14} className={`transition-transform ${isRhythmDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isRhythmDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-[#151518] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-2 flex flex-col gap-1">
                      <div className="px-3 py-2 text-[10px] font-black text-amber-500 uppercase tracking-widest border-b border-white/10 mb-2">Batidas e levadas</div>
                      {Object.keys(RHYTHM_PATTERNS).map(rhythm => (
                        <button
                          key={rhythm}
                          onClick={() => {
                            setSelectedRhythm(rhythm);
                            setIsRhythmDropdownOpen(false);
                            if (isPlaying) {
                              stopPlayback();
                              setTimeout(startPlayback, 100);
                            }
                          }}
                          className={`px-4 py-3 rounded-xl text-left transition-all text-[10px] font-black uppercase tracking-widest ${selectedRhythm === rhythm ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                        >
                          {rhythm}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chord Selector Dropdown */}
            <div className="relative flex flex-col gap-1">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Dicionário de acordes</span>
              <button 
                onClick={() => {
                  setIsChordDropdownOpen(!isChordDropdownOpen);
                  setIsRhythmDropdownOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2 bg-zinc-900/80 border border-white/10 rounded-xl hover:bg-zinc-800 transition-all text-xs font-bold text-white uppercase tracking-widest"
              >
                <Music size={14} className="text-amber-500" />
                {selectedChord}
                <ChevronDown size={14} className={`transition-transform ${isChordDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isChordDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-[#151518] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-2 grid grid-cols-2 gap-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                      <div className="col-span-2 px-3 py-2 text-[10px] font-black text-amber-500 uppercase tracking-widest border-b border-white/10 mb-2">Dicionário de acordes</div>
                      <div className="col-span-2 px-3 py-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-white/5 mb-1">Major Chords</div>
                      {Object.keys(CHORDS_DATA).filter(c => !c.includes("Minor")).map(chord => (
                        <button
                          key={chord}
                          onClick={() => {
                            setSelectedChord(chord);
                            setIsChordDropdownOpen(false);
                            strumChord(chord, 'down');
                            if (isPlaying) {
                              stopPlayback();
                              setTimeout(startPlayback, 100);
                            }
                          }}
                          className={`group relative px-3 py-3 rounded-xl text-left transition-all ${selectedChord === chord ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-[12px] font-black tracking-tight">{chord.split(' ')[0]}</span>
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${selectedChord === chord ? 'text-black/60' : 'text-zinc-600'}`}>Major</span>
                          </div>
                          {selectedChord === chord && (
                            <motion.div layoutId="active-chord" className="absolute inset-0 border-2 border-white/20 rounded-xl pointer-events-none" />
                          )}
                        </button>
                      ))}
                      <div className="col-span-2 px-3 py-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-white/5 my-1">Minor Chords</div>
                      {Object.keys(CHORDS_DATA).filter(c => c.includes("Minor")).map(chord => (
                        <button
                          key={chord}
                          onClick={() => {
                            setSelectedChord(chord);
                            setIsChordDropdownOpen(false);
                            strumChord(chord, 'down');
                            if (isPlaying) {
                              stopPlayback();
                              setTimeout(startPlayback, 100);
                            }
                          }}
                          className={`group relative px-3 py-3 rounded-xl text-left transition-all ${selectedChord === chord ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-[12px] font-black tracking-tight">{chord.split(' ')[0]}</span>
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${selectedChord === chord ? 'text-black/60' : 'text-zinc-600'}`}>Minor</span>
                          </div>
                          {selectedChord === chord && (
                            <motion.div layoutId="active-chord" className="absolute inset-0 border-2 border-white/20 rounded-xl pointer-events-none" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>


        {/* Song Structure Editor */}
        <div className="w-full bg-[#151518] border border-white/5 rounded-[2rem] p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Settings2 size={16} className="text-amber-500" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Song Editor</h3>
            </div>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Format: | G | C | D | G |</span>
          </div>
          <input
            type="text"
            value={songInput}
            onChange={(e) => setSongInput(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-amber-500 font-mono text-lg focus:outline-none focus:border-amber-500/50 transition-all"
            placeholder="| G | C | D | G |"
          />
        </div>

        {/* Horizontal Timeline - Moved and Refined */}
        <div className="w-full bg-[#151518] border border-white/5 rounded-[2rem] p-6 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <RotateCcw size={16} className="text-amber-500" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Live Timeline</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-amber-500 animate-pulse' : 'bg-zinc-800'}`} />
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{isPlaying ? 'On Air' : 'Standby'}</span>
            </div>
          </div>
          
          <div 
            className="relative w-full overflow-x-auto custom-scrollbar pb-4 scroll-smooth" 
            ref={timelineRef}
            style={{ scrollBehavior: 'smooth' }}
          >
            <div className="flex gap-3 min-w-max px-4">
              {songStructure.map((chord, index) => (
                <motion.div
                  key={index}
                  data-measure-index={index}
                  animate={{
                    borderColor: currentMeasureIndex === index ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.05)',
                    backgroundColor: currentMeasureIndex === index ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    scale: currentMeasureIndex === index ? 1.05 : 1,
                  }}
                  className="relative w-28 h-20 border rounded-2xl flex flex-col items-center justify-center transition-all duration-300"
                >
                  <span className={`text-xl font-black transition-colors ${currentMeasureIndex === index ? 'text-amber-500' : 'text-white'}`}>
                    {chord.split(' ')[0]}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{chord.split(' ')[1]}</span>
                  
                  {/* Measure Number */}
                  <span className={`absolute top-2 left-3 text-[8px] font-black ${currentMeasureIndex === index ? 'text-amber-500/50' : 'text-zinc-800'}`}>
                    {index + 1}
                  </span>

                  {/* Cursor within measure */}
                  {currentMeasureIndex === index && isPlaying && (
                    <motion.div 
                      className="absolute bottom-0 left-0 h-1 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                      style={{ width: `${playbackProgress * 100}%` }}
                    />
                  )}
                </motion.div>
              ))}
              
              {/* Visual Buffer */}
              <div className="w-28 h-20 border border-dashed border-white/5 rounded-2xl flex items-center justify-center opacity-10">
                <RotateCcw size={20} className="text-zinc-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Interface Grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Rhythm & Controls */}
          <div className="lg:col-span-7 space-y-8">
            {/* Arrow Pattern - Sophisticated Cards */}
            <div className={`grid gap-1 sm:gap-2`} style={{ gridTemplateColumns: `repeat(${selectedRhythm === "Pop Lento" ? 8 : RHYTHM_PATTERNS[selectedRhythm].length}, 1fr)` }}>
              {RHYTHM_PATTERNS[selectedRhythm].map((item, index) => (
                <div key={index} className="flex flex-col items-center space-y-1">
                  {!item.isSilent ? (
                    <motion.div
                      animate={{
                        backgroundColor: activeArrowIndex === index ? '#f59e0b' : '#1a1a1e',
                        borderColor: activeArrowIndex === index ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                        y: activeArrowIndex === index ? (item.direction === 'down' ? 4 : -4) : 0,
                      }}
                      className="w-full aspect-square rounded-lg border flex items-center justify-center transition-all duration-100 shadow-lg"
                    >
                      {item.direction === 'down' ? (
                        <ArrowDown className={activeArrowIndex === index ? 'text-black' : 'text-zinc-500'} size={selectedRhythm === "Pop Lento" ? 14 : 20} strokeWidth={3} />
                      ) : (
                        <ArrowUp className={activeArrowIndex === index ? 'text-black' : 'text-zinc-500'} size={selectedRhythm === "Pop Lento" ? 14 : 20} strokeWidth={3} />
                      )}
                    </motion.div>
                  ) : (
                    <div className="w-full aspect-square rounded-lg border border-dashed border-white/5 opacity-10 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-zinc-800" />
                    </div>
                  )}
                  <span className={`text-[8px] font-black ${activeArrowIndex === index ? 'text-amber-500' : 'text-zinc-700'}`}>
                    {item.isSilent ? '-' : item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#151518] border border-white/5 rounded-[2rem] p-8 space-y-10 shadow-2xl">
              {/* Playback Control */}
              <div className="flex items-center justify-center gap-8">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'}`}
                >
                  {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>

                <button
                  disabled={!isLoaded}
                  onClick={togglePlayback}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                    !isLoaded ? 'bg-zinc-800 cursor-not-allowed' : 
                    isPlaying ? 'bg-zinc-100 text-black scale-95' : 'bg-amber-500 text-black hover:scale-105 shadow-amber-500/20'
                  }`}
                >
                  {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} className="ml-2" fill="currentColor" />}
                </button>

                <button
                  onClick={() => {
                    stopPlayback();
                    setTimeout(startPlayback, 100);
                  }}
                  className="p-4 rounded-2xl bg-zinc-800/50 text-zinc-400 hover:text-white transition-all"
                >
                  <RotateCcw size={24} />
                </button>
              </div>

              {/* Tempo Slider */}
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Master Tempo</span>
                    <span className="text-4xl font-black tabular-nums text-white">{bpm} <span className="text-sm font-medium text-amber-500">BPM</span></span>
                  </div>
                </div>
                <div className="relative group">
                  <input
                    type="range"
                    min="40"
                    max="160"
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="absolute -bottom-6 left-0 w-full flex justify-between text-[8px] font-bold text-zinc-700 uppercase tracking-widest">
                    <span>Adagio</span>
                    <span>Moderato</span>
                    <span>Allegro</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Bento */}
            <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-[2rem] flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Music size={20} className="text-amber-500" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Acoustic Nylon Engine</h4>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Real-time sample interpolation with 48kHz high-fidelity output.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chord Diagram Card */}
        <div className="w-full max-w-md bg-[#151518] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Music size={16} className="text-amber-500" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">{selectedChord} Fingering</h3>
            </div>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Standard Tuning</span>
          </div>

          <div className="relative flex justify-center gap-4 py-4">
            {/* Fret Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none px-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-full h-px bg-zinc-800/50" />
              ))}
            </div>

            {/* Strings & Dots */}
            {CHORD_DIAGRAMS[selectedChord].map((fret, stringIdx) => (
              <div key={stringIdx} className="relative flex flex-col items-center w-8 h-40">
                {/* String Line */}
                <div className="absolute inset-y-0 w-px bg-zinc-700/50" />
                
                {/* Nut/Fret Marker */}
                <div className="absolute -top-6 text-[10px] font-black text-zinc-500">
                  {fret === "x" ? "×" : fret === 0 ? "○" : ""}
                </div>

                {/* Finger Dot */}
                {typeof fret === 'number' && fret > 0 && (
                  <motion.div
                    key={`${selectedChord}-${stringIdx}-${fret}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute w-5 h-5 rounded-full bg-amber-500 border-2 border-black shadow-lg z-10 flex items-center justify-center"
                    style={{ top: `${(fret - 0.5) * (100 / 5)}%` }}
                  >
                    <span className="text-[8px] font-black text-black">{fret}</span>
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-between px-4 text-[9px] font-black text-zinc-700 uppercase tracking-widest">
            <span>E</span>
            <span>A</span>
            <span>D</span>
            <span>G</span>
            <span>B</span>
            <span>E</span>
          </div>
        </div>
      </div>

      {/* Footer Hardware Detail */}
      <footer className="mt-auto pt-12 pb-6 w-full max-w-4xl flex flex-col md:flex-row justify-between items-center border-t border-white/5 gap-6">
        <div className="flex flex-col gap-1">
          <div className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.5em]">
            SERIAL NO: RL-2026-G-MAJ
          </div>
          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">
            Criado por: <span className="text-amber-500">minha logo</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">Professor Isael Martins</p>
            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">© 2026 All Rights Reserved</p>
          </div>
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
