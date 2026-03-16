import React, { useState, useMemo, useEffect } from 'react';
import { Film, CalendarDays, Popcorn, Star, Plus, Users, Clapperboard, Check, Heart, Search, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

const PROFILES = [
  { id: 'p1', name: 'Will', icon: '👦', color: 'bg-blue-600', text: 'text-blue-500', glow: 'shadow-blue-500/20' },
  { id: 'p2', name: 'Andrielly', icon: '👩', color: 'bg-rose-500', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
];

export default function App() {
  const [movies, setMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('diary');
  const [activeProfile, setActiveProfile] = useState(PROFILES[0].id);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovieModal, setSelectedMovieModal] = useState(null);

  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [newMovie, setNewMovie] = useState({
    title: '',
    duration: '',
    genre: '',
    rating: 4,
    favorite: false,
    viewers: [PROFILES[0].id],
    poster_path: '',
    overview: '',
    director: ''
  });

  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data) {
        setMovies(data);
      }
      setIsLoading(false);
    };

    fetchMovies();
  }, []);

  const searchTMDB = async (e) => {
    e.preventDefault();
    if (!tmdbSearchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(tmdbSearchQuery)}&language=pt-BR&api_key=${import.meta.env.VITE_TMDB_API_KEY}`);
      const data = await res.json();
      setTmdbResults(data.results.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
    setIsSearching(false);
  };

  const selectTMDBMovie = async (tmdbId) => {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=credits&language=pt-BR&api_key=${import.meta.env.VITE_TMDB_API_KEY}`);
      const data = await res.json();
      
      const director = data.credits?.crew?.find(c => c.job === 'Director')?.name || 'Desconhecido';
      const genre = data.genres?.[0]?.name || 'Não classificado';

      setNewMovie(prev => ({
        ...prev,
        title: data.title,
        duration: data.runtime || '',
        genre: genre,
        poster_path: data.poster_path,
        overview: data.overview,
        director: director
      }));
      setTmdbResults([]);
      setTmdbSearchQuery('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleViewer = (profileId) => {
    setNewMovie(prev => {
      const isSelected = prev.viewers.includes(profileId);
      if (isSelected && prev.viewers.length === 1) return prev;
      return {
        ...prev,
        viewers: isSelected ? prev.viewers.filter(id => id !== profileId) : [...prev.viewers, profileId]
      };
    });
  };

  const handleAddMovie = async (e) => {
    e.preventDefault();
    if (!newMovie.title || !newMovie.duration) return;

    const movieData = {
      title: newMovie.title,
      duration: parseInt(newMovie.duration),
      genre: newMovie.genre,
      rating: newMovie.rating,
      favorite: newMovie.favorite,
      viewers: newMovie.viewers,
      poster_path: newMovie.poster_path,
      overview: newMovie.overview,
      director: newMovie.director,
      date: new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase.from('movies').insert([movieData]).select();

    if (!error && data) {
      setMovies([data[0], ...movies]);
      setShowAddModal(false);
      setNewMovie({ 
        title: '', duration: '', genre: '', rating: 4, favorite: false, viewers: [activeProfile === 'both' ? PROFILES[0].id : activeProfile], poster_path: '', overview: '', director: '' 
      });
    }
  };

  const filteredMovies = useMemo(() => {
    if (activeProfile === 'both') {
      const grouped = {};
      
      movies.forEach(m => {
        const key = m.title.trim().toLowerCase();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(m);
      });

      const bothWatched = [];
      
      Object.values(grouped).forEach(group => {
        const allViewers = new Set(group.flatMap(m => m.viewers));
        
        if (allViewers.has('p1') && allViewers.has('p2')) {
          const mP1 = group.find(m => m.viewers.includes('p1')) || group[0];
          const mP2 = group.find(m => m.viewers.includes('p2')) || group[0];

          bothWatched.push({
            ...group[0],
            id: `merged_${group[0].id}`,
            viewers: ['p1', 'p2'],
            isMerged: true,
            rating_p1: mP1.rating,
            rating_p2: mP2.rating,
            fav_p1: mP1.favorite,
            fav_p2: mP2.favorite,
            rating: Math.max(mP1.rating, mP2.rating),
            favorite: mP1.favorite || mP2.favorite
          });
        }
      });
      
      return bothWatched.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return movies.filter(m => {
      const v = Array.isArray(m.viewers) ? m.viewers : [];
      return v.includes(activeProfile);
    });
  }, [movies, activeProfile]);

  const stats = useMemo(() => {
    if (filteredMovies.length === 0) return null;

    const totalMovies = filteredMovies.length;
    const totalMinutes = filteredMovies.reduce((acc, movie) => acc + movie.duration, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    const favoriteMovies = filteredMovies.filter(m => m.favorite).slice(0, 5);
    const favoriteCount = filteredMovies.filter(m => m.favorite).length;

    const genreCount = filteredMovies.reduce((acc, movie) => {
      if(movie.genre) acc[movie.genre] = (acc[movie.genre] || 0) + 1;
      return acc;
    }, {});

    const sortedGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
    const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : 'N/A';

    return { 
      totalMovies, 
      totalHours, 
      remainingMinutes, 
      favoriteCount, 
      topGenre, 
      sortedGenres: sortedGenres.slice(0, 5),
      favoriteMovies 
    };
  }, [filteredMovies]);

  const currentProfileData = activeProfile === 'both' 
    ? { name: 'Assistidos Juntos', color: 'bg-purple-600', text: 'text-purple-400', glow: 'shadow-purple-500/20' }
    : PROFILES.find(p => p.id === activeProfile);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-300 font-sans selection:bg-red-500/30 pb-20">
      <nav className="bg-[#111114] border-b border-zinc-800/80 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-red-600 p-1.5 rounded-lg">
                <Clapperboard className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-wider">CINE<span className="text-zinc-500 font-light">LOG</span></h1>
            </div>

            <div className="flex items-center bg-zinc-900 rounded-full p-1 border border-zinc-800">
              {PROFILES.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => setActiveProfile(profile.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeProfile === profile.id ? `${profile.color} text-white shadow-md` : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>{profile.icon}</span>
                  <span className="hidden sm:inline">{profile.name}</span>
                </button>
              ))}
              <div className="w-px h-4 bg-zinc-800 mx-1"></div>
              <button
                onClick={() => setActiveProfile('both')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeProfile === 'both' ? `bg-purple-600 text-white shadow-md` : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Users className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-6 mt-2">
            <button onClick={() => setActiveTab('diary')} className={`pb-3 text-sm font-medium uppercase tracking-wider transition-all border-b-2 ${activeTab === 'diary' ? `border-red-500 text-white` : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              Diário
            </button>
            <button onClick={() => setActiveTab('recap')} className={`pb-3 text-sm font-medium uppercase tracking-wider transition-all border-b-2 ${activeTab === 'recap' ? `border-red-500 text-white` : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              Retrospectiva
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 relative">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-light text-white">
              Visão de <span className={`font-bold ${currentProfileData.text}`}>{currentProfileData.name}</span>
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {activeTab === 'diary' ? 'Todos os filmes registrados.' : 'Suas estatísticas do ano.'}
            </p>
          </div>
          {activeTab === 'diary' && (
            <button onClick={() => setShowAddModal(!showAddModal)} className="bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-full transition-colors border border-zinc-700 shadow-lg z-10">
              <Plus className={`w-5 h-5 transition-transform ${showAddModal ? 'rotate-45' : ''}`} />
            </button>
          )}
        </div>

        {showAddModal && activeTab === 'diary' && (
          <div className="mb-8 bg-[#1a1a1e] border border-zinc-800 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Popcorn className="w-5 h-5 text-red-500" /> Registrar Sessão
            </h3>

            <form onSubmit={searchTMDB} className="mb-6 flex gap-2">
              <input
                type="text"
                value={tmdbSearchQuery}
                onChange={(e) => setTmdbSearchQuery(e.target.value)}
                placeholder="Buscar título na base de dados..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 placeholder:text-zinc-600"
              />
              <button type="submit" disabled={isSearching} className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 rounded-xl border border-zinc-700 transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </form>

            {tmdbResults.length > 0 && (
              <div className="mb-6 space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Selecione o Filme Correto</p>
                {tmdbResults.map(res => (
                  <button key={res.id} type="button" onClick={() => selectTMDBMovie(res.id)} className="w-full flex items-center gap-4 bg-zinc-900/50 hover:bg-zinc-800 p-2 rounded-lg border border-transparent hover:border-zinc-700 text-left transition-colors">
                    {res.poster_path ? (
                      <img src={`https://image.tmdb.org/t/p/w92${res.poster_path}`} alt="" className="w-10 h-14 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-14 bg-zinc-800 rounded flex items-center justify-center"><Film className="w-4 h-4 text-zinc-600"/></div>
                    )}
                    <div>
                      <p className="text-white font-medium">{res.title}</p>
                      <p className="text-zinc-500 text-sm">{res.release_date?.split('-')[0]}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleAddMovie} className="space-y-5 border-t border-zinc-800 pt-6">
              
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Quem assistiu?</label>
                <div className="flex gap-2">
                  {PROFILES.map(profile => (
                    <button key={profile.id} type="button" onClick={() => handleToggleViewer(profile.id)} className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${newMovie.viewers.includes(profile.id) ? `${profile.color} border-transparent text-white` : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
                      {newMovie.viewers.includes(profile.id) && <Check className="w-4 h-4" />}
                      <span>{profile.icon} {profile.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Nome do Filme (Editável)</label>
                <input type="text" required value={newMovie.title} onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Duração (min)</label>
                  <input type="number" required min="1" value={newMovie.duration} onChange={(e) => setNewMovie({ ...newMovie, duration: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Gênero</label>
                  <input type="text" required value={newMovie.genre} onChange={(e) => setNewMovie({ ...newMovie, genre: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" />
                </div>
              </div>

              <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Avaliação</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setNewMovie({ ...newMovie, rating: star })} className="p-1 transition-transform hover:scale-110">
                        <Star className={`w-8 h-8 ${newMovie.rating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-center border-l border-zinc-800 pl-6">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Amei?</label>
                  <button type="button" onClick={() => setNewMovie({ ...newMovie, favorite: !newMovie.favorite })} className="p-1 transition-transform hover:scale-110">
                    <Heart className={`w-8 h-8 ${newMovie.favorite ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-zinc-700'}`} />
                  </button>
                </div>
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3.5 rounded-xl transition-colors shadow-lg shadow-red-600/20 mt-4">
                Salvar no Diário
              </button>
            </form>
          </div>
        )}

        {activeTab === 'diary' ? (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-20 bg-[#111114] rounded-2xl border border-zinc-800 border-dashed">
                <p className="text-zinc-400">Carregando filmes...</p>
              </div>
            ) : filteredMovies.length === 0 ? (
              <div className="text-center py-20 bg-[#111114] rounded-2xl border border-zinc-800 border-dashed">
                <Film className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400">Nenhum filme encontrado para este perfil.</p>
              </div>
            ) : (
              filteredMovies.map((movie) => (
                <div 
                  key={movie.id}
                  onClick={() => setSelectedMovieModal(movie)}
                  className="group relative bg-[#111114] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-zinc-600 transition-all hover:shadow-xl hover:bg-[#151519] cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {movie.poster_path ? (
                      <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt="" className="w-12 h-16 object-cover rounded-md shadow-md" />
                    ) : (
                      <div className="w-12 h-16 bg-zinc-900 rounded-md flex items-center justify-center border border-zinc-800"><Film className="w-5 h-5 text-zinc-700"/></div>
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-zinc-100 group-hover:text-white transition-colors flex items-center gap-2">
                        {movie.title}
                        {movie.isMerged ? (
                          <div className="flex gap-1">
                            {movie.fav_p1 && <Heart className="w-3 h-3 text-blue-500 fill-blue-500" title="Will amou" />}
                            {movie.fav_p2 && <Heart className="w-3 h-3 text-rose-500 fill-rose-500" title="Adriele amou" />}
                          </div>
                        ) : (
                          movie.favorite && <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500 mt-1">
                        <span className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">{movie.genre}</span>
                        <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 opacity-70" /> {movie.duration}m</span>
                        <div className="flex items-center gap-1">
                          {movie.viewers.map(vId => {
                            const p = PROFILES.find(p => p.id === vId);
                            if(!p) return null;
                            return <span key={vId} title={`Visto por ${p.name}`} className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${p.color} text-white`}>{p.icon}</span>
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {movie.isMerged && movie.rating_p1 !== movie.rating_p2 ? (
                    <div className="flex flex-col gap-1 bg-black/40 px-2 py-1.5 rounded-xl border border-zinc-800/50 text-xs">
                      <div className="flex items-center gap-1.5"><span>👦</span> <span className="text-yellow-500 font-bold">{movie.rating_p1}</span><Star className="w-3 h-3 text-yellow-500 fill-yellow-500"/></div>
                      <div className="flex items-center gap-1.5"><span>👩</span> <span className="text-yellow-500 font-bold">{movie.rating_p2}</span><Star className="w-3 h-3 text-yellow-500 fill-yellow-500"/></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 bg-black/40 px-3 py-2 rounded-xl border border-zinc-800/50">
                      <span className="text-lg font-bold text-yellow-500 leading-none">{movie.rating || movie.rating_p1}</span>
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {!stats ? (
              <div className="text-center py-20 bg-[#111114] rounded-2xl border border-zinc-800 border-dashed">
                <p className="text-zinc-400">Assista a alguns filmes para ver a retrospectiva.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className={`relative overflow-hidden rounded-3xl p-8 border border-zinc-800 bg-gradient-to-br ${currentProfileData.color.replace('bg-', 'from-')}/10 to-[#111114]`}>
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-zinc-400 font-medium mb-1 uppercase tracking-widest text-xs">Tempo de Tela</h3>
                      <div className="text-5xl sm:text-7xl font-light text-white tracking-tight mb-2">
                        {stats.totalHours}<span className="text-2xl text-zinc-500">h</span> {stats.remainingMinutes}<span className="text-2xl text-zinc-500">m</span>
                      </div>
                    </div>
                    
                    <div className="w-full md:w-auto grid grid-cols-2 gap-4">
                       <div className="bg-[#0a0a0c]/80 backdrop-blur p-5 rounded-2xl border border-zinc-800 text-center">
                          <Film className={`w-8 h-8 mx-auto mb-2 ${currentProfileData.text}`} />
                          <div className="text-sm text-zinc-400 uppercase tracking-wider text-[10px]">Total Filmes</div>
                          <div className="text-lg font-medium text-white">{stats.totalMovies}</div>
                       </div>
                       <div className="bg-[#0a0a0c]/80 backdrop-blur p-5 rounded-2xl border border-zinc-800 text-center">
                          <Heart className="w-8 h-8 mx-auto mb-2 text-rose-500 fill-rose-500" />
                          <div className="text-sm text-zinc-400 uppercase tracking-wider text-[10px]">Amei (Total)</div>
                          <div className="text-lg font-medium text-white">{stats.favoriteCount}</div>
                       </div>
                    </div>
                  </div>
                  <div className={`absolute -top-20 -right-20 w-64 h-64 ${currentProfileData.color} rounded-full mix-blend-screen filter blur-[100px] opacity-20`}></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#111114] border border-zinc-800 rounded-3xl p-6">
                    <h3 className="text-lg font-medium text-white mb-6">Top 5 Gêneros</h3>
                    <div className="space-y-5">
                      {stats.sortedGenres.map(([genre, count], index) => {
                        const percentage = Math.round((count / stats.totalMovies) * 100);
                        return (
                          <div key={genre} className="relative">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-medium text-zinc-200">{index + 1}. {genre}</span>
                              <span className="text-zinc-500">{count} filmes</span>
                            </div>
                            <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                              <div className={`h-full rounded-full ${currentProfileData.color}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="bg-[#111114] border border-zinc-800 rounded-3xl p-6">
                    <h3 className="text-lg font-medium text-white mb-6">Top 5 Amei ❤️</h3>
                    {stats.favoriteMovies.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {stats.favoriteMovies.map(movie => (
                          <div key={movie.id} className="relative aspect-[2/3] rounded-lg overflow-hidden group cursor-pointer border border-zinc-800" onClick={() => setSelectedMovieModal(movie)}>
                            {movie.poster_path ? (
                              <img src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`} alt={movie.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                            ) : (
                              <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><Film className="w-4 h-4 text-zinc-700"/></div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-sm text-center py-10">Nenhum filme favoritado ainda.</p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {selectedMovieModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#111114] border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
              <button onClick={() => setSelectedMovieModal(null)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 transition-colors z-10 backdrop-blur">
                <X className="w-5 h-5" />
              </button>
              
              <div className="relative h-64 w-full bg-zinc-900">
                {selectedMovieModal.poster_path ? (
                  <img src={`https://image.tmdb.org/t/p/w500${selectedMovieModal.poster_path}`} alt="" className="w-full h-full object-cover opacity-50 mask-image-b" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Clapperboard className="w-12 h-12 text-zinc-800" /></div>
                )}
                <div className="absolute bottom-0 left-0 w-full p-6 flex items-end gap-6">
                  {selectedMovieModal.poster_path && (
                    <img src={`https://image.tmdb.org/t/p/w342${selectedMovieModal.poster_path}`} alt="" className="w-24 rounded-lg shadow-2xl border border-zinc-700/50" />
                  )}
                  <div className="flex-1 pb-2">
                    <h2 className="text-2xl font-bold text-white leading-tight flex items-center gap-2">
                      {selectedMovieModal.title}
                      {selectedMovieModal.isMerged ? (
                        <>
                          {selectedMovieModal.fav_p1 && <span title="Will amou" className="flex items-center gap-0.5 text-xs"><Heart className="w-4 h-4 text-blue-500 fill-blue-500" />👦</span>}
                          {selectedMovieModal.fav_p2 && <span title="Adriele amou" className="flex items-center gap-0.5 text-xs"><Heart className="w-4 h-4 text-rose-500 fill-rose-500" />👩</span>}
                        </>
                      ) : (
                        selectedMovieModal.favorite && <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                      )}
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">{selectedMovieModal.director && `Dirigido por ${selectedMovieModal.director}`}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  {selectedMovieModal.isMerged && selectedMovieModal.rating_p1 !== selectedMovieModal.rating_p2 ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                        👦 <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> <span className="text-white font-medium">{selectedMovieModal.rating_p1}/5</span>
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                        👩 <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> <span className="text-white font-medium">{selectedMovieModal.rating_p2}/5</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-white font-medium">{selectedMovieModal.rating}/5</span>
                    </div>
                  )}
                  
                  <span className="text-zinc-500 text-sm">{selectedMovieModal.duration} min</span>
                  <span className="text-zinc-500 text-sm flex items-center gap-1 before:content-['•'] before:mr-2">{selectedMovieModal.genre}</span>
                </div>
                
                <h3 className="text-white font-medium mb-2">Sinopse</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  {selectedMovieModal.overview || "Nenhuma sinopse disponível para este filme."}
                </p>

                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Visto por:</span>
                  <div className="flex gap-2">
                    {selectedMovieModal.viewers.map(vId => {
                      const p = PROFILES.find(p => p.id === vId);
                      if(!p) return null;
                      return (
                        <div key={vId} className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${p.color} bg-opacity-20 border border-${p.color.replace('bg-', '')}/30`}>
                          <span>{p.icon}</span>
                          <span className={`text-xs font-medium ${p.text}`}>{p.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}