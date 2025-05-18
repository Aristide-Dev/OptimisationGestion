import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import axios from 'axios'
import { Cuboid, ChevronDown, RotateCcw, Layers, DollarSign, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTerminal } from '@/components/TerminalContext'
import { Projets, projetsTypes, ProjetType } from '@/components/Projets'

interface Amelioration {
  quantite: number
  prix: number
  production: number
  debloqueA: number
  debloque: boolean
}

interface Ameliorations {
  moules: Amelioration
  ouvriers: Amelioration
  petiteUsine: Amelioration
  grandeUsine: Amelioration
  etudeMarche: Amelioration
  optimisationProduction: Amelioration
  gestionRessources: Amelioration
  [key: string]: Amelioration
}

interface Demande {
  niveau: number
  tendance: number
  prixUnitaire: number
  multiplicateurPrix: number
}

interface Levier {
  production: number
  coutArgile: number
  coutEau: number
  efficacite: number
}

interface Generateur {
  niveau: number
  production: number
  prixBase: number
  multiplicateurPrix: number
}

interface Generateurs {
  excavatrice: Generateur
  irrigation: Generateur
  recyclageBriques: Generateur
  [key: string]: Generateur
}

interface Evenement {
  actif: boolean;
  type: string | null;
  nom: string;
  description: string;
  effetPrix: number;
  effetDemande: number;
  effetCoutProduction: number;
  duree: number;
  tempsRestant: number;
}

interface GameData {
  briques: number
  argile: number
  eau: number
  briquesManuelles: number
  briquesFabriquees: number
  fondsDispo: number
  etatJeu: string
  progression: number
  ameliorations: Ameliorations
  demande: Demande
  levier: Levier
  generateurs: Generateurs
  evenements: Evenement
}

interface Props {
  gameData: GameData
}

export default function Index({ gameData: initialGameData }: Props) {
  const [gameData, setGameData] = useState<GameData>(initialGameData)
  const [isLoading, setIsLoading] = useState(false)
  const [availableProjets, setAvailableProjets] = useState<ProjetType[]>([])
  const [projetCooldown, setProjetCooldown] = useState(false)
  const [projetsRealises, setProjetsRealises] = useState(0)
  const { addMessage } = useTerminal()
  
      
  // Formatage des nombres pour l'affichage
  const formatNumber = (num: number): string => {
    return num.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
  }

  // Formatage spécifique pour les montants en GNF
  const formatGNF = (num: number): string => {
    return num.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' GNF'
  }

  // Calcul de la production automatique par seconde
  const getAutoProductionRate = (): number => {
    let totalProduction = 0
    
    if (gameData.ameliorations) {
      totalProduction += (gameData.ameliorations.ouvriers?.quantite || 0) * (gameData.ameliorations.ouvriers?.production || 0)
      totalProduction += (gameData.ameliorations.petiteUsine?.quantite || 0) * (gameData.ameliorations.petiteUsine?.production || 0)
      totalProduction += (gameData.ameliorations.grandeUsine?.quantite || 0) * (gameData.ameliorations.grandeUsine?.production || 0)
    }
    
    return totalProduction
  }

  // Calcul du prix après inflation
  const calculatePrice = (basePrice: number, quantity: number): number => {
    return Math.floor(basePrice * Math.pow(1.15, quantity))
  }

  // Calcul du prix de vente actuel en fonction de la demande
  const getPrixVenteActuel = (): number => {
    let prix = (gameData.demande?.prixUnitaire || 1500) * (gameData.demande?.multiplicateurPrix || 1.0);
    
    // Appliquer l'effet des événements sur le prix
    if (gameData.evenements?.actif) {
      const modificateurPrix = 1 + ((gameData.evenements?.effetPrix || 0) / 100);
      prix = prix * modificateurPrix;
    }
    
    return prix;
  }

  // Mise à jour du levier de production
  const ajusterLevier = (nouvelleValeur: number) => {
    // Limiter les valeurs entre 50% et 150%
    const valeurLimitee = Math.max(50, Math.min(150, nouvelleValeur));
    
    setGameData(prev => {
      // Calculer les nouveaux coûts en fonction du levier
      // Plus le levier est élevé, plus on consomme de ressources, mais plus la production est efficace
      const nouveauCoutArgile = prev.levier.coutArgile * (valeurLimitee / 100);
      const nouveauCoutEau = prev.levier.coutEau * (valeurLimitee / 100);
      
      // L'efficacité augmente ou diminue plus lentement que les coûts
      // Cela crée un compromis: produire plus vite coûte proportionnellement plus cher
      const nouvelleEfficacite = Math.sqrt(valeurLimitee / 100);
      
      return {
        ...prev,
        levier: {
          ...prev.levier,
          production: valeurLimitee,
          coutArgile: parseFloat(nouveauCoutArgile.toFixed(2)),
          coutEau: parseFloat(nouveauCoutEau.toFixed(2)),
          efficacite: parseFloat(nouvelleEfficacite.toFixed(2))
        }
      };
    });
    
    addMessage(`Levier de production ajusté à ${valeurLimitee}%`, 'info');
  }

  // Mettre à jour la logique de fabrication manuelle de briques pour prendre en compte le levier
  const fabriquerBrique = () => {
    if (!gameData.levier) return;
    
    // Coûts ajustés selon le levier de production
    const coutArgile = gameData.levier.coutArgile;
    const coutEau = gameData.levier.coutEau;
    
    if (gameData.argile >= coutArgile && gameData.eau >= coutEau) {
      // Production ajustée selon l'efficacité du levier
      const productionBase = 1 + (gameData.ameliorations?.moules?.quantite || 0) * (gameData.ameliorations?.moules?.production || 0);
      const productionAjustee = productionBase * (gameData.levier?.efficacite || 1.0);
      
      setGameData(prev => {
        // Vérification des déblocages
        const newAmeliorations = { ...(prev.ameliorations || {}) }
        
        Object.keys(newAmeliorations).forEach(key => {
          const item = newAmeliorations[key as keyof Ameliorations]
          if (item && !item.debloque && prev.briquesFabriquees + productionAjustee >= item.debloqueA) {
            newAmeliorations[key as keyof Ameliorations] = {
              ...item,
              debloque: true
            }
            
            addMessage(`Nouvelle amélioration débloquée ! Votre usine peut maintenant utiliser des ${key}`, 'success')
          }
        })

        return {
          ...prev,
          briques: prev.briques + productionAjustee,
          argile: prev.argile - coutArgile,
          eau: prev.eau - coutEau,
          briquesManuelles: prev.briquesManuelles + 1,
          briquesFabriquees: prev.briquesFabriquees + productionAjustee,
          ameliorations: newAmeliorations,
          progression: prev.progression + 1
        }
      })
    } else {
      addMessage(`Matières premières insuffisantes ! (Besoin de ${coutArgile} argile et ${coutEau} eau)`, 'error')
    }
  }

  // Mise à jour de la logique de production automatique
  const updateAutomaticProduction = () => {
    const autoProductionRateBase = getAutoProductionRate();
    // Production ajustée selon l'efficacité du levier
    const autoProductionRate = autoProductionRateBase * gameData.levier.efficacite;
    
    if (autoProductionRate > 0) {
      setGameData(prev => {
        // Coûts ajustés selon le levier
        const coutArgileUnitaire = prev.levier.coutArgile;
        const coutEauUnitaire = prev.levier.coutEau;
        
        // Calculons combien de briques on peut produire en fonction des ressources disponibles
        const argileDispo = prev.argile;
        const eauDispo = prev.eau;
        
        // On peut produire autant de briques que les ressources le permettent
        const maxBriquesFromArgile = argileDispo / coutArgileUnitaire;
        const maxBriquesFromEau = eauDispo / coutEauUnitaire;
        
        const maxBriques = Math.floor(Math.min(maxBriquesFromArgile, maxBriquesFromEau, autoProductionRate));
        
        if (maxBriques <= 0) {
          // On n'affiche le message que si la production était active avant
          if (prev.argile > 0 && prev.eau > 0) {
            addMessage('Production arrêtée ! Plus assez de ressources', 'error')
          }
          return prev
        }
        
        // Vérification des déblocages
        const newAmeliorations = { ...prev.ameliorations }
        
        Object.keys(newAmeliorations).forEach(key => {
          const item = newAmeliorations[key as keyof Ameliorations]
          if (!item.debloque && prev.briquesFabriquees + maxBriques >= item.debloqueA) {
            newAmeliorations[key as keyof Ameliorations] = {
              ...item,
              debloque: true
            }
            
            addMessage(`Nouvelle amélioration débloquée ! Vous pouvez maintenant acheter des ${key}`, 'success')
          }
        })
        
        return {
          ...prev,
          briques: prev.briques + maxBriques,
          argile: prev.argile - (maxBriques * coutArgileUnitaire),
          eau: prev.eau - (maxBriques * coutEauUnitaire),
          briquesFabriquees: prev.briquesFabriquees + maxBriques,
          ameliorations: newAmeliorations,
          progression: prev.progression + 1
        }
      })
    }
  }

  // Mise à jour de la fonction de vente pour prendre en compte la demande
  const vendreBriques = (quantite: number) => {
    if (gameData.briques >= quantite) {
      const prixUnitaire = getPrixVenteActuel();
      const revenu = Math.round(prixUnitaire * quantite);
      
      setGameData(prev => ({
        ...prev,
        briques: prev.briques - quantite,
        fondsDispo: prev.fondsDispo + revenu
      }));
      
      addMessage(`Vous avez vendu ${quantite} briques pour ${formatGNF(revenu)}`, 'success');
    } else {
      addMessage(`Vous n'avez pas assez de briques à vendre ! (${Math.floor(gameData.briques)} disponibles)`, 'error');
    }
  };

  // Calcul du prix d'amélioration d'un générateur
  const calculateGenerateurPrice = (generateur: Generateur): number => {
    if (!generateur) return 0;
    const niveau = generateur.niveau || 0;
    return Math.floor((generateur.prixBase || 300000) * Math.pow((generateur.multiplicateurPrix || 1.3), niveau));
  };

  // Fonction pour améliorer un générateur
  const ameliorerGenerateur = (type: keyof Generateurs) => {
    if (!gameData.generateurs) return;
    
    const generateur = gameData.generateurs[type];
    if (!generateur) return;
    
    const prixAmelioration = calculateGenerateurPrice(generateur);
    
    if (gameData.fondsDispo >= prixAmelioration) {
      setGameData(prev => {
        // S'assurer que les générateurs existent
        const generateurs = { ...(prev.generateurs || {}) };
        
        // Mettre à jour le niveau du générateur
        generateurs[type] = {
          ...(generateurs[type] || {}),
          niveau: (generateurs[type]?.niveau || 0) + 1
        };
        
        return {
          ...prev,
          fondsDispo: prev.fondsDispo - prixAmelioration,
          generateurs
        };
      });
      
      const descriptions: Record<keyof Generateurs, string> = {
        excavatrice: "d'extracteur d'argile",
        irrigation: "d'irrigation",
        recyclageBriques: "de recyclage de briques"
      };
      
      addMessage(`Vous avez amélioré votre système ${descriptions[type]} au niveau ${(gameData.generateurs[type]?.niveau || 0) + 1} pour ${formatGNF(prixAmelioration)}`, 'success');
    } else {
      addMessage(`Trésorerie insuffisante ! Il vous faut ${formatGNF(prixAmelioration)}`, 'error');
    }
  };

  // Générer un message approprié selon le type d'amélioration
  const messagesAmeliorations: Record<string, string> = {
    moules: `Vous avez acheté des nouveaux moules pour $prix. Chaque clic produit plus de briques !`,
    ouvriers: `Vous avez embauché plus d'ouvriers pour $prix. La production automatique est augmentée.`,
    petiteUsine: `Vous avez installé une petite usine pour $prix. La production automatique est considérablement augmentée.`,
    grandeUsine: `Vous avez construit une grande usine pour $prix. Votre production automatique explose !`,
    etudeMarche: `Vous avez commandé une étude de marché pour $prix. Vous pouvez maintenant voir les tendances de prix.`,
    optimisationProduction: `Vous avez optimisé votre production pour $prix. Votre levier de production est plus efficace.`,
    gestionRessources: `Vous avez mis en place un système de gestion des ressources pour $prix. Vous pouvez maintenant construire des générateurs automatiques.`
  };

  // Mettre à jour la fonction d'achat d'amélioration pour débloquer les générateurs
  const acheterAmelioration = (type: keyof Ameliorations) => {
    if (!gameData.ameliorations) return;
    
    const amelioration = gameData.ameliorations[type];
    if (!amelioration) return;
    
    // Vérifier si l'amélioration est disponible
    if (!amelioration.debloque) {
      addMessage(`Cette amélioration n'est pas encore disponible. Produisez plus de briques pour la débloquer.`, 'error');
      return;
    }
    
    // Calculer le prix actuel (augmentation avec chaque achat)
    const prix = calculatePrice(amelioration.prix, amelioration.quantite);
    
    if (gameData.fondsDispo >= prix) {
      setGameData(prev => {
        // Créer une copie des améliorations
        const newAmeliorations = { ...(prev.ameliorations || {}) };
        
        // Mettre à jour la quantité de l'amélioration
        if (newAmeliorations[type]) {
          newAmeliorations[type] = {
            ...newAmeliorations[type],
            quantite: (newAmeliorations[type].quantite || 0) + 1
          };
        }
        
        return {
          ...prev,
          fondsDispo: prev.fondsDispo - prix,
          ameliorations: newAmeliorations
        };
      });
      
      const message = messagesAmeliorations[type] 
        ? messagesAmeliorations[type].replace('$prix', formatGNF(prix))
        : `Vous avez acheté ${type} pour ${formatGNF(prix)}.`;
        
      addMessage(message, 'success');
    } else {
      addMessage(`Trésorerie insuffisante ! Il vous faut ${formatGNF(prix)}`, 'error');
    }
  };

  // Achat de ressources
  const acheterRessource = (type: 'argile' | 'eau', quantite: number, prix: number) => {
    if (gameData.fondsDispo >= prix) {
      setGameData(prev => ({
        ...prev,
        [type]: prev[type] + quantite,
        fondsDispo: prev.fondsDispo - prix
      }));
      
      addMessage(`Vous avez acheté ${quantite} unités de ${type} pour ${formatGNF(prix)}`, 'success');
    } else {
      addMessage(`Trésorerie insuffisante ! Il vous faut ${formatGNF(prix)}`, 'error');
    }
  };

  // Réinitialisation du jeu
  const resetGame = async () => {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser le jeu ? Toute votre progression sera perdue.")) {
      setIsLoading(true)
      try {
        const response = await axios.post(route('game.reset'))
        if (response.data.success) {
          addMessage('Jeu réinitialisé avec succès', 'warning')
          window.location.reload()
        }
      } catch (error) {
        console.error("Erreur lors de la réinitialisation du jeu:", error)
        addMessage('Erreur lors de la réinitialisation du jeu', 'error')
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Sauvegarde automatique
  const saveGameData = async () => {
    try {
      await axios.post(route('game.update'), gameData)
      addMessage('Partie sauvegardée', 'info')
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      addMessage('Erreur lors de la sauvegarde', 'error')
    }
  }

  // Fonction pour mettre à jour la demande du marché (appelée à intervalle régulier)
  const updateDemande = () => {
    // Chance sur 100 que la tendance change
    const chanceChangementTendance = Math.random() * 100;
    
    setGameData(prev => {
      let nouvelleTendance = prev.demande.tendance;
      
      // 15% de chance que la tendance change
      if (chanceChangementTendance < 15) {
        const tendances = [-1, 0, 1];
        // Exclure la tendance actuelle pour forcer un changement
        const nouvellesTendancesPossibles = tendances.filter(t => t !== prev.demande.tendance);
        nouvelleTendance = nouvellesTendancesPossibles[Math.floor(Math.random() * nouvellesTendancesPossibles.length)];
        
        // Notifier l'utilisateur si l'étude de marché est débloquée
        if (prev.ameliorations?.etudeMarche?.quantite > 0) {
          const tendanceTexte = nouvelleTendance === 1 ? "hausse" : (nouvelleTendance === -1 ? "baisse" : "stabilisation");
          addMessage(`Étude de marché : Tendance en ${tendanceTexte}`, 'info');
        }
      }
      
      // Calculer modification base selon la tendance
      const modificationBase = nouvelleTendance * Math.floor(Math.random() * 3 + 1);
      
      // Appliquer l'effet des événements sur la demande
      let modificationTotale = modificationBase;
      if (prev.evenements.actif) {
        // Ajouter l'impact de l'événement (effet sur 100 secondes)
        modificationTotale += (prev.evenements.effetDemande / (prev.evenements.duree / 10));
      }
      
      // Calculer le nouveau niveau de demande en fonction de l'impact total
      let nouveauNiveau = prev.demande.niveau + modificationTotale;
      nouveauNiveau = Math.max(70, Math.min(130, nouveauNiveau));
      
      // Calcul du multiplicateur de prix en fonction du niveau de demande
      // Formule : 0.7 + (niveau / 100 * 0.6) => donne entre 0.7 et 1.3 fois le prix de base
      const nouveauMultiplicateur = 0.7 + (nouveauNiveau / 100 * 0.6);
      
      return {
        ...prev,
        demande: {
          ...prev.demande,
          niveau: nouveauNiveau,
          tendance: nouvelleTendance,
          multiplicateurPrix: parseFloat(nouveauMultiplicateur.toFixed(2))
        }
      };
    });
  }

  // Gestion des projets
  const handleProjetsAppearance = () => {
    if (!projetCooldown && availableProjets.length < 3 && Math.random() < 0.3) { // 30% de chances qu'un projet apparaisse
      // On sélectionne un projet qui n'est pas déjà disponible
      const existingIds = availableProjets.map(p => p.id);
      const availableProjetTypes = projetsTypes.filter(p => !existingIds.includes(p.id));
      
      if (availableProjetTypes.length > 0) {
        const randomProjet = availableProjetTypes[Math.floor(Math.random() * availableProjetTypes.length)];
        setAvailableProjets(prev => [...prev, randomProjet]);
        
        addMessage(`Nouveau projet disponible : ${randomProjet.name}`, 'info');
        
        // Définit un cooldown pour éviter trop de projets en même temps
        setProjetCooldown(true);
        setTimeout(() => {
          setProjetCooldown(false);
        }, 30000); // 30 secondes de cooldown entre les apparitions potentielles
      }
    }
  };

  // Réalisation d'un projet
  const realiserProjet = (projet: ProjetType) => {
    addMessage(`Projet réalisé : ${projet.name} - ${projet.description}`, 'success');
    
    // Application de l'effet du projet
    projet.effect((type, amount) => {
      setGameData(prev => {
        // Résout le problème de typage en vérifiant si la propriété existe
        if (type in prev) {
          // Utilisez un type plus spécifique pour éviter le "any"
          const updatedData = { ...prev };
          if (type === 'briques') updatedData.briques += amount;
          else if (type === 'argile') updatedData.argile += amount;
          else if (type === 'eau') updatedData.eau += amount;
          else if (type === 'fondsDispo') updatedData.fondsDispo += amount;
          return updatedData;
        }
        return prev;
      });
    });
    
    // Retirer le projet de la liste des disponibles
    setAvailableProjets(prev => prev.filter(p => p.id !== projet.id));
    setProjetsRealises(prev => prev + 1);
    
    // Message sur le progrès de l'usine
    addMessage(`Votre usine de briques se développe grâce à ce projet !`, 'info');
  };

  // Ajouter la fonction de génération automatique de ressources
  const updateResourceGenerators = () => {
    // Vérifier que les générateurs existent
    if (!gameData.generateurs) return;
    
    // Ne mettre à jour que si au moins un générateur est actif
    const hasActiveGenerators = Object.values(gameData.generateurs || {}).some(gen => gen && gen.niveau > 0);
    
    if (hasActiveGenerators) {
      setGameData(prev => {
        const generateurs = prev.generateurs || {
          excavatrice: { niveau: 0, production: 0.2, prixBase: 300000, multiplicateurPrix: 1.3 },
          irrigation: { niveau: 0, production: 0.3, prixBase: 250000, multiplicateurPrix: 1.3 },
          recyclageBriques: { niveau: 0, production: 0.05, prixBase: 600000, multiplicateurPrix: 1.4 }
        };
        
        // Calculer la production d'argile avec facteur exponentiel (1.2^niveau)
        // La production augmente de manière exponentielle avec le niveau
        const niveauExcavatrice = generateurs.excavatrice?.niveau || 0;
        const productionBaseExcavatrice = generateurs.excavatrice?.production || 0.2;
        const facteurProgressionExcavatrice = Math.pow(1.2, niveauExcavatrice); // Augmentation exponentielle
        const productionArgile = niveauExcavatrice * productionBaseExcavatrice * facteurProgressionExcavatrice;
        
        // Production d'argile supplémentaire du recyclage avec facteur exponentiel
        const niveauRecyclage = generateurs.recyclageBriques?.niveau || 0;
        const productionBaseRecyclage = generateurs.recyclageBriques?.production || 0.05;
        const facteurProgressionRecyclage = Math.pow(1.15, niveauRecyclage); // Augmentation exponentielle
        const productionArgileRecyclage = niveauRecyclage * productionBaseRecyclage * facteurProgressionRecyclage;
        
        // Calculer la production d'eau avec facteur exponentiel (1.2^niveau)
        const niveauIrrigation = generateurs.irrigation?.niveau || 0;
        const productionBaseIrrigation = generateurs.irrigation?.production || 0.3;
        const facteurProgressionIrrigation = Math.pow(1.2, niveauIrrigation); // Augmentation exponentielle
        const productionEau = niveauIrrigation * productionBaseIrrigation * facteurProgressionIrrigation;
        
        // Production d'eau supplémentaire du recyclage
        const productionEauRecyclage = niveauRecyclage * productionBaseRecyclage * facteurProgressionRecyclage;
        
        // Arrondir les productions pour éviter des valeurs trop précises
        const arrondir = (valeur: number) => Math.round(valeur * 100) / 100;
        
        return {
          ...prev,
          argile: prev.argile + arrondir(productionArgile + productionArgileRecyclage),
          eau: prev.eau + arrondir(productionEau + productionEauRecyclage)
        };
      });
    }
  }

  // Définir la liste des événements économiques possibles
  const evenementsPossibles = [
    // Événements positifs (prix à la hausse)
    {
      type: 'economique',
      nom: 'Boom immobilier',
      description: 'Une explosion du secteur immobilier augmente fortement la demande en briques et leur prix.',
      effetPrix: 30, // +30%
      effetDemande: 40, // +40%
      effetCoutProduction: 0,
      duree: 60, // 60 secondes
    },
    {
      type: 'politique',
      nom: 'Subvention gouvernementale',
      description: 'Un programme de développement urbain favorise la vente de vos briques à prix plus élevé.',
      effetPrix: 25, // +25%
      effetDemande: 15, // +15%
      effetCoutProduction: -10, // -10%
      duree: 90, // 90 secondes
    },
    {
      type: 'environnement',
      nom: 'Pénurie de ressources',
      description: "Une pénurie régionale d'argile fait grimper le prix des briques.",
      effetPrix: 35, // +35%
      effetDemande: -10, // -10%
      effetCoutProduction: 20, // +20%
      duree: 45, // 45 secondes
    },
    {
      type: 'commercial',
      nom: 'Exportations vers les pays voisins',
      description: 'Des commandes internationales font grimper les prix de vente.',
      effetPrix: 20, // +20%
      effetDemande: 20, // +20%
      effetCoutProduction: 0,
      duree: 70, // 70 secondes
    },
    // Événements négatifs (prix à la baisse)
    {
      type: 'economique',
      nom: 'Crise économique',
      description: 'Une récession fait chuter la demande et les prix des matériaux de construction.',
      effetPrix: -25, // -25%
      effetDemande: -30, // -30%
      effetCoutProduction: -10, // -10%
      duree: 80, // 80 secondes
    },
    {
      type: 'concurrence',
      nom: 'Nouvelle usine concurrente',
      description: "L'ouverture d'une usine à proximité vous force à baisser vos prix.",
      effetPrix: -20, // -20%
      effetDemande: -15, // -15%
      effetCoutProduction: 0,
      duree: 60, // 60 secondes
    },
    {
      type: 'environnement',
      nom: 'Saison des pluies',
      description: 'Les fortes pluies ralentissent les chantiers et réduisent la demande.',
      effetPrix: -15, // -15%
      effetDemande: -25, // -25%
      effetCoutProduction: 15, // +15%
      duree: 50, // 50 secondes
    },
    {
      type: 'politique',
      nom: 'Nouvelle régulation',
      description: 'Une nouvelle norme sur les matériaux fait baisser temporairement les prix.',
      effetPrix: -20, // -20%
      effetDemande: -10, // -10%
      effetCoutProduction: 20, // +20%
      duree: 65, // 65 secondes
    },
    {
      type: 'social',
      nom: 'Grève des transporteurs',
      description: 'Une grève des transporteurs complique la livraison et affecte les prix.',
      effetPrix: -15, // -15%
      effetDemande: -20, // -20%
      effetCoutProduction: 10, // +10%
      duree: 55, // 55 secondes
    },
  ];

  // Ajouter la fonction pour déclencher les événements économiques aléatoires
  const checkForNewEvent = () => {
    // Si un événement est déjà actif, ne pas en déclencher un nouveau
    if (gameData.evenements?.actif) {
      return;
    }

    // Chance de déclencher un événement (5% toutes les 30 secondes)
    const chanceEvenement = Math.random() * 100;
    
    // Seulement déclencher si le hasard est favorable et si le joueur a débloqué l'étude de marché
    if (chanceEvenement < 5 && (gameData.ameliorations?.etudeMarche?.quantite || 0) > 0) {
      // Sélectionner un événement aléatoire
      const evenementAleatoire = evenementsPossibles[Math.floor(Math.random() * evenementsPossibles.length)];
      
      setGameData(prev => ({
        ...prev,
        evenements: {
          ...(prev.evenements || {}),
          actif: true,
          type: evenementAleatoire.type,
          nom: evenementAleatoire.nom,
          description: evenementAleatoire.description,
          effetPrix: evenementAleatoire.effetPrix || 0,  // Assurer qu'il y a toujours une valeur
          effetDemande: evenementAleatoire.effetDemande,
          effetCoutProduction: evenementAleatoire.effetCoutProduction,
          duree: evenementAleatoire.duree,
          tempsRestant: evenementAleatoire.duree
        }
      }));
      
      // Notifier le joueur
      addMessage(`ÉVÉNEMENT ÉCONOMIQUE : ${evenementAleatoire.nom} - ${evenementAleatoire.description}`, 'warning');
    }
  };

  // Ajouter la fonction pour gérer les événements actifs
  const updateEvents = () => {
    if (gameData.evenements.actif) {
      setGameData(prev => {
        // Réduire le temps restant
        const tempsRestant = prev.evenements.tempsRestant - 1;
        
        // Si l'événement est terminé
        if (tempsRestant <= 0) {
          addMessage(`L'événement "${prev.evenements.nom}" est terminé. Le marché revient à la normale.`, 'info');
          
          return {
            ...prev,
            evenements: {
              ...prev.evenements,
              actif: false,
              tempsRestant: 0
            }
          };
        }
        
        // Sinon, mettre à jour le temps restant
        return {
          ...prev,
          evenements: {
            ...prev.evenements,
            tempsRestant
          }
        };
      });
    }
  };

  // Effet pour le message de bienvenue (exécuté une seule fois)
  useEffect(() => {
    // Message initial
    addMessage('Bienvenue dans BriquesAfrique ! Gérez votre usine de fabrication de briques en Guinée.', 'info')
  }, [])
  
  // Effet pour la production automatique et l'apparition des projets
  useEffect(() => {
    // Production automatique toutes les secondes
    const interval = setInterval(() => {
      updateAutomaticProduction();
      handleProjetsAppearance();
      updateResourceGenerators(); // Ajouter la génération automatique de ressources
      updateEvents(); // Mettre à jour les événements actifs
    }, 1000);
    
    // Sauvegarde automatique toutes les 30 secondes (moins fréquent)
    const saveInterval = setInterval(saveGameData, 30000);
    
    // Ajouter un effet pour mettre à jour la demande périodiquement
    const demandeInterval = setInterval(updateDemande, 15000); // Toutes les 15 secondes
    
    // Vérifier périodiquement si un nouvel événement doit être déclenché
    const evenementInterval = setInterval(checkForNewEvent, 30000); // Toutes les 30 secondes
    
    return () => {
      if (interval) clearInterval(interval);
      if (saveInterval) clearInterval(saveInterval);
      if (demandeInterval) clearInterval(demandeInterval);
      if (evenementInterval) clearInterval(evenementInterval);
    }
  }, [gameData, projetCooldown, availableProjets]);

  // Ajout d'une fonction pour vérifier et initialiser les données manquantes
  useEffect(() => {
    // Vérifier si les nouvelles propriétés existent et les initialiser si nécessaire
    setGameData(prev => {
      const newData = { ...prev };
      let needsUpdate = false;

      // Vérifier les améliorations
      if (!newData.ameliorations.gestionRessources) {
        needsUpdate = true;
        newData.ameliorations.gestionRessources = {
          quantite: 0,
          prix: 800,
          production: 0,
          debloqueA: 300,
          debloque: newData.briquesFabriquees >= 300
        };
      }

      // Vérifier les générateurs
      if (!newData.generateurs) {
        needsUpdate = true;
        newData.generateurs = {
          excavatrice: {
            niveau: 0,
            production: 0.2,
            prixBase: 300,
            multiplicateurPrix: 1.3
          },
          irrigation: {
            niveau: 0,
            production: 0.3,
            prixBase: 250,
            multiplicateurPrix: 1.3
          },
          recyclageBriques: {
            niveau: 0,
            production: 0.05,
            prixBase: 600,
            multiplicateurPrix: 1.4
          }
        };
      } else {
        // Vérifier chaque générateur individuellement
        if (!newData.generateurs.excavatrice) {
          needsUpdate = true;
          newData.generateurs.excavatrice = {
            niveau: 0,
            production: 0.2,
            prixBase: 300,
            multiplicateurPrix: 1.3
          };
        }
        
        if (!newData.generateurs.irrigation) {
          needsUpdate = true;
          newData.generateurs.irrigation = {
            niveau: 0,
            production: 0.3,
            prixBase: 250,
            multiplicateurPrix: 1.3
          };
        }
        
        if (!newData.generateurs.recyclageBriques) {
          needsUpdate = true;
          newData.generateurs.recyclageBriques = {
            niveau: 0,
            production: 0.05,
            prixBase: 600,
            multiplicateurPrix: 1.4
          };
        }
      }

      // Vérifier la demande et le levier
      if (!newData.demande) {
        needsUpdate = true;
        newData.demande = {
          niveau: 100,
          tendance: 0,
          prixUnitaire: 1.5,
          multiplicateurPrix: 1.0
        };
      }
      
      if (!newData.levier) {
        needsUpdate = true;
        newData.levier = {
          production: 100,
          coutArgile: 1.0,
          coutEau: 0.5,
          efficacite: 1.0
        };
      }

      return needsUpdate ? newData : prev;
    });
  }, []);

  return (
    <>
      <Head title="BriquesAfrique - Un jeu incrémental" />
      
      <div className="container mx-auto h-screen flex flex-col pt-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-primary">BriquesAfrique - Usine de Briques en Guinée</h1>
          <Button 
            variant="outline" 
            onClick={resetGame}
            disabled={isLoading}
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow overflow-auto relative">
          {/* Tableau de bord principal */}
          <Card className="md:col-span-2">
            <CardHeader className="py-3">
              <CardTitle>Tableau de bord de l'usine</CardTitle>
              <CardDescription>Gérez votre production de briques et développez votre entreprise en Guinée</CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-center">                  <div className="flex justify-center mb-1">                    <Cuboid className="w-6 h-6 text-primary" />                  </div>                  <div className="text-lg font-bold">{formatNumber(gameData.briques)}</div>                  <div className="text-xs text-muted-foreground">Briques</div>                </div>                                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-center">                  <div className="flex justify-center mb-1">                    <ChevronDown className="w-6 h-6 text-blue-500" />                  </div>                  <div className="text-lg font-bold">{formatNumber(gameData.eau)}</div>                  <div className="text-xs text-muted-foreground">Eau</div>                </div>                                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-center">                  <div className="flex justify-center mb-1">                    <Layers className="w-6 h-6 text-amber-700" />                  </div>                  <div className="text-lg font-bold">{formatNumber(gameData.argile)}</div>                  <div className="text-xs text-muted-foreground">Argile</div>                </div>                                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-center">                  <div className="flex justify-center mb-1">                    <DollarSign className="w-6 h-6 text-green-600" />                  </div>                  <div className="text-lg font-bold">{formatGNF(gameData.fondsDispo)}</div>                  <div className="text-xs text-muted-foreground">Trésorerie</div>                </div>              </div>                            {/* Affichage des événements économiques */}              {gameData.evenements?.actif && (                <div className="mb-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3 rounded-lg">                  <div className="flex items-center mb-1">                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mr-2" />                    <span className="font-medium text-amber-800 dark:text-amber-400">{gameData.evenements.nom}</span>                    <span className="ml-auto text-xs bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded text-amber-800 dark:text-amber-300">                      {Math.floor(gameData.evenements.tempsRestant)}s                    </span>                  </div>                  <p className="text-sm text-amber-700 dark:text-amber-300">{gameData.evenements.description}</p>                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">                    <div className={`${gameData.evenements.effetPrix >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>                      Prix: {gameData.evenements.effetPrix >= 0 ? '+' : ''}{gameData.evenements.effetPrix}%                    </div>                    <div className={`${gameData.evenements.effetDemande >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>                      Demande: {gameData.evenements.effetDemande >= 0 ? '+' : ''}{gameData.evenements.effetDemande}%                    </div>                    <div className={`${gameData.evenements.effetCoutProduction <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>                      Coûts: {gameData.evenements.effetCoutProduction >= 0 ? '+' : ''}{gameData.evenements.effetCoutProduction}%                    </div>                  </div>                </div>              )}                            <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium">Production manuelle</span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(1 + gameData.ameliorations.moules.quantite * gameData.ameliorations.moules.production)} briques/clic
                    </span>
                  </div>
                  <Button 
                    className="w-full h-16 text-base"
                    onClick={fabriquerBrique}
                    disabled={gameData.argile < 1 || gameData.eau < 0.5}
                  >
                    Produire des briques
                  </Button>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium">Production automatique</span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(getAutoProductionRate())} briques/sec
                    </span>
                  </div>
                  <Progress value={Math.min(100, (gameData.progression % 100))} className="h-2" />
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    size="sm"
                    onClick={() => vendreBriques(1)}
                    disabled={gameData.briques < 1}
                  >
                    Vendre 1
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    size="sm"
                    onClick={() => vendreBriques(10)}
                    disabled={gameData.briques < 10}
                  >
                    Vendre 10
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    size="sm"
                    onClick={() => vendreBriques(Math.floor(gameData.briques))}
                    disabled={gameData.briques < 1}
                  >
                    Tout vendre
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques et Projets */}
          <Card>
            <Tabs defaultValue="stats">
              <TabsList className="w-full">
                <TabsTrigger value="stats" className="flex-1">Statistiques</TabsTrigger>
                <TabsTrigger value="projets" className="flex-1">Projets</TabsTrigger>
                <TabsTrigger value="production" className="flex-1">Production</TabsTrigger>
                {gameData.ameliorations?.gestionRessources?.quantite > 0 && (
                  <TabsTrigger value="ressources" className="flex-1">Ressources</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="stats">
                <CardHeader className="py-3">
                  <CardTitle>Statistiques</CardTitle>
                  <CardDescription>Progression</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pb-3">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Briques fabriquées</span>
                      <span className="text-sm font-medium">{formatNumber(gameData.briquesFabriquees)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Briques manuelles</span>
                      <span className="text-sm font-medium">{formatNumber(gameData.briquesManuelles)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Production auto</span>
                      <span className="text-sm font-medium">{formatNumber(getAutoProductionRate())} /sec</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Projets réalisés</span>
                      <span className="text-sm font-medium">{projetsRealises}</span>
                    </div>
                    
                    {gameData.ameliorations?.etudeMarche?.quantite > 0 && (
                      <>
                        <div className="mt-4 mb-2 border-t pt-2">
                          <div className="text-xs font-medium">Rapports de marché</div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Prix de vente</span>
                          <span className="text-sm font-medium">{getPrixVenteActuel().toFixed(2)} GNF/brique</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Demande</span>
                          <span className={`text-sm font-medium ${
                            gameData.demande.niveau > 110 
                              ? 'text-green-500' 
                              : (gameData.demande.niveau < 90 ? 'text-red-500' : '')
                          }`}>
                            {gameData.demande.niveau > 110 
                              ? 'Forte' 
                              : (gameData.demande.niveau < 90 ? 'Faible' : 'Normale')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Tendance</span>
                          <span className="text-sm font-medium">
                            {gameData.demande.tendance > 0 
                              ? '↗️ En hausse' 
                              : (gameData.demande.tendance < 0 ? '↘️ En baisse' : '→ Stable')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="projets">
                <CardHeader className="py-3">
                  <CardTitle>Projets</CardTitle>
                  <CardDescription>Développez votre entreprise</CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <Projets 
                    projets={availableProjets} 
                    onRealize={realiserProjet} 
                  />
                </CardContent>
              </TabsContent>
              
              <TabsContent value="production">
                <CardHeader className="py-3">
                  <CardTitle>Contrôle de Production</CardTitle>
                  <CardDescription>Ajustez votre production</CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium">Niveau de production</span>
                        <span className="text-xs text-muted-foreground">
                          {gameData.levier.production}%
                        </span>
                      </div>
                      <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${gameData.levier.production}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">50%</span>
                        <span className="text-xs text-muted-foreground">100%</span>
                        <span className="text-xs text-muted-foreground">150%</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        size="sm"
                        onClick={() => ajusterLevier(Math.max(50, gameData.levier.production - 10))}
                        disabled={gameData.levier.production <= 50}
                      >
                        -10%
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        size="sm"
                        onClick={() => ajusterLevier(100)}
                      >
                        Normal (100%)
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        size="sm"
                        onClick={() => ajusterLevier(Math.min(150, gameData.levier.production + 10))}
                        disabled={gameData.levier.production >= 150}
                      >
                        +10%
                      </Button>
                    </div>
                    
                    <div className="mt-4 space-y-1 border-t pt-2">
                      <div className="text-xs font-medium mb-2">Statistiques de production</div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Efficacité</span>
                        <span className="text-sm font-medium">{(gameData.levier.efficacite * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Coût en argile</span>
                        <span className="text-sm font-medium">{gameData.levier.coutArgile.toFixed(2)} GNF/brique</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Coût en eau</span>
                        <span className="text-sm font-medium">{gameData.levier.coutEau.toFixed(2)} GNF/brique</span>
                      </div>
                      <div className="border-t mt-2 pt-2">
                        <div className="text-xs italic text-muted-foreground">
                          Augmenter la production accélère la fabrication mais consomme plus de ressources.
                          Diminuer la production permet d'économiser des ressources mais ralentit la fabrication.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="ressources">
                <CardHeader className="py-3">
                  <CardTitle>Générateurs de Ressources</CardTitle>
                  <CardDescription>Automatisez l'approvisionnement de votre usine</CardDescription>
                </CardHeader>
                <CardContent className="pb-3 space-y-4">
                  {/* Excavatrice */}
                  <Card>
                    <CardHeader className="py-2">
                      <CardTitle className="text-base flex items-center">
                        <div className="w-6 h-6 bg-amber-700 rounded-full mr-2"></div>
                        Excavatrice d'Argile
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Génère automatiquement de l'argile
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Niveau:</span>
                        <span>{gameData.generateurs?.excavatrice?.niveau || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Production:</span>
                        <span>
                          {(() => {
                            const niveau = gameData.generateurs?.excavatrice?.niveau || 0;
                            const productionBase = gameData.generateurs?.excavatrice?.production || 0.2;
                            const facteurProgression = Math.pow(1.2, niveau);
                            const productionTotale = niveau * productionBase * facteurProgression;
                            return productionTotale.toFixed(1);
                          })()} argile/sec
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Prix amélioration:</span>
                        <span>{formatNumber(calculateGenerateurPrice(gameData.generateurs?.excavatrice || { niveau: 0, production: 0.2, prixBase: 300, multiplicateurPrix: 1.3 }))}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => ameliorerGenerateur('excavatrice')}
                        disabled={gameData.fondsDispo < calculateGenerateurPrice(gameData.generateurs?.excavatrice || { niveau: 0, production: 0.2, prixBase: 300, multiplicateurPrix: 1.3 })}
                      >
                        Améliorer
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  {/* Système d'irrigation */}
                  <Card>
                    <CardHeader className="py-2">
                      <CardTitle className="text-base flex items-center">
                        <div className="w-6 h-6 bg-blue-500 rounded-full mr-2"></div>
                        Système d'Irrigation
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Génère automatiquement de l'eau
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Niveau:</span>
                        <span>{gameData.generateurs?.irrigation?.niveau || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Production:</span>
                        <span>
                          {(() => {
                            const niveau = gameData.generateurs?.irrigation?.niveau || 0;
                            const productionBase = gameData.generateurs?.irrigation?.production || 0.3;
                            const facteurProgression = Math.pow(1.2, niveau);
                            const productionTotale = niveau * productionBase * facteurProgression;
                            return productionTotale.toFixed(1);
                          })()} eau/sec
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Prix amélioration:</span>
                        <span>{formatNumber(calculateGenerateurPrice(gameData.generateurs?.irrigation || { niveau: 0, production: 0.3, prixBase: 250, multiplicateurPrix: 1.3 }))}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => ameliorerGenerateur('irrigation')}
                        disabled={gameData.fondsDispo < calculateGenerateurPrice(gameData.generateurs?.irrigation || { niveau: 0, production: 0.3, prixBase: 250, multiplicateurPrix: 1.3 })}
                      >
                        Améliorer
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  {/* Système de Recyclage */}
                  <Card>
                    <CardHeader className="py-2">
                      <CardTitle className="text-base flex items-center">
                        <div className="w-6 h-6 bg-green-600 rounded-full mr-2"></div>
                        Recyclage de Briques
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Récupère de l'argile et de l'eau des briques défectueuses
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Niveau:</span>
                        <span>{gameData.generateurs?.recyclageBriques?.niveau || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Production:</span>
                        <span>
                          {(() => {
                            const niveau = gameData.generateurs?.recyclageBriques?.niveau || 0;
                            const productionBase = gameData.generateurs?.recyclageBriques?.production || 0.05;
                            const facteurProgression = Math.pow(1.15, niveau);
                            const productionTotale = niveau * productionBase * facteurProgression;
                            return productionTotale.toFixed(2);
                          })()} de chaque/sec
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Prix amélioration:</span>
                        <span>{formatNumber(calculateGenerateurPrice(gameData.generateurs?.recyclageBriques || { niveau: 0, production: 0.05, prixBase: 600, multiplicateurPrix: 1.4 }))}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => ameliorerGenerateur('recyclageBriques')}
                        disabled={gameData.fondsDispo < calculateGenerateurPrice(gameData.generateurs?.recyclageBriques || { niveau: 0, production: 0.05, prixBase: 600, multiplicateurPrix: 1.4 })}
                      >
                        Améliorer
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <div className="border-t pt-2 text-xs text-muted-foreground">
                    Les générateurs automatisent l'approvisionnement de votre usine en matières premières essentielles.
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
          
          {/* Onglets d'achat et d'amélioration */}
          <Card className="md:col-span-3">
            <CardHeader className="py-3">
              <CardTitle>Développement industriel</CardTitle>
              <CardDescription>Investissez dans votre usine pour améliorer votre production</CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <Tabs defaultValue="ameliorations">
                <TabsList className="mb-3">
                  <TabsTrigger value="ameliorations">Améliorations</TabsTrigger>
                  <TabsTrigger value="ressources">Ressources</TabsTrigger>
                </TabsList>
                
                <TabsContent value="ameliorations" className="max-h-[calc(100vh-25rem)] overflow-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Moules */}
                    <Card className={`${gameData.ameliorations.moules.debloque ? '' : 'opacity-50'}`}>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Moules</CardTitle>
                        <CardDescription className="text-xs">Moules améliorés pour une production plus efficace</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Possédés:</span>
                          <span>{gameData.ameliorations.moules.quantite}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(calculatePrice(gameData.ameliorations.moules.prix, gameData.ameliorations.moules.quantite))}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterAmelioration('moules')}
                          disabled={!gameData.ameliorations.moules.debloque || 
                            gameData.fondsDispo < calculatePrice(gameData.ameliorations.moules.prix, gameData.ameliorations.moules.quantite)}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* Ouvriers */}
                    <Card className={`${gameData.ameliorations.ouvriers.debloque ? '' : 'opacity-50'}`}>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Ouvriers</CardTitle>
                        <CardDescription className="text-xs">Recrutez des ouvriers spécialisés</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Possédés:</span>
                          <span>{gameData.ameliorations.ouvriers.quantite}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(calculatePrice(gameData.ameliorations.ouvriers.prix, gameData.ameliorations.ouvriers.quantite))}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterAmelioration('ouvriers')}
                          disabled={!gameData.ameliorations.ouvriers.debloque || 
                            gameData.fondsDispo < calculatePrice(gameData.ameliorations.ouvriers.prix, gameData.ameliorations.ouvriers.quantite)}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* Petite Usine */}
                    <Card className={`${gameData.ameliorations.petiteUsine.debloque ? '' : 'opacity-50'}`}>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Petite Usine</CardTitle>
                        <CardDescription className="text-xs">Installation semi-automatisée</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Possédées:</span>
                          <span>{gameData.ameliorations.petiteUsine.quantite}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(calculatePrice(gameData.ameliorations.petiteUsine.prix, gameData.ameliorations.petiteUsine.quantite))}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterAmelioration('petiteUsine')}
                          disabled={!gameData.ameliorations.petiteUsine.debloque || 
                            gameData.fondsDispo < calculatePrice(gameData.ameliorations.petiteUsine.prix, gameData.ameliorations.petiteUsine.quantite)}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* Grande Usine */}
                    <Card className={`${gameData.ameliorations.grandeUsine.debloque ? '' : 'opacity-50'}`}>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Grande Usine</CardTitle>
                        <CardDescription className="text-xs">Ligne de production industrielle</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Possédées:</span>
                          <span>{gameData.ameliorations.grandeUsine.quantite}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(calculatePrice(gameData.ameliorations.grandeUsine.prix, gameData.ameliorations.grandeUsine.quantite))}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterAmelioration('grandeUsine')}
                          disabled={!gameData.ameliorations.grandeUsine.debloque || 
                            gameData.fondsDispo < calculatePrice(gameData.ameliorations.grandeUsine.prix, gameData.ameliorations.grandeUsine.quantite)}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* Étude de Marché */}
                    <Card className={`${gameData.ameliorations.etudeMarche.debloque ? '' : 'opacity-50'}`}>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Étude de Marché</CardTitle>
                        <CardDescription className="text-xs">Analysez la demande en briques du marché local</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Niveau:</span>
                          <span>{gameData.ameliorations.etudeMarche.quantite}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(calculatePrice(gameData.ameliorations.etudeMarche.prix, gameData.ameliorations.etudeMarche.quantite))}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterAmelioration('etudeMarche')}
                          disabled={!gameData.ameliorations.etudeMarche.debloque || 
                            gameData.fondsDispo < calculatePrice(gameData.ameliorations.etudeMarche.prix, gameData.ameliorations.etudeMarche.quantite)}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* Optimisation de Production */}
                    <Card className={`${gameData.ameliorations.optimisationProduction.debloque ? '' : 'opacity-50'}`}>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Optimisation</CardTitle>
                        <CardDescription className="text-xs">Améliorez vos processus de fabrication</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Niveau:</span>
                          <span>{gameData.ameliorations.optimisationProduction.quantite}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(calculatePrice(gameData.ameliorations.optimisationProduction.prix, gameData.ameliorations.optimisationProduction.quantite))}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterAmelioration('optimisationProduction')}
                          disabled={!gameData.ameliorations.optimisationProduction.debloque || 
                            gameData.fondsDispo < calculatePrice(gameData.ameliorations.optimisationProduction.prix, gameData.ameliorations.optimisationProduction.quantite)}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* Gestion des Ressources */}
                    <Card className={`${gameData.ameliorations?.gestionRessources?.debloque ? '' : 'opacity-50'}`}>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Gestion Ressources</CardTitle>
                        <CardDescription className="text-xs">Automatisez l'approvisionnement de l'usine</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Niveau:</span>
                          <span>{gameData.ameliorations?.gestionRessources?.quantite || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(calculatePrice(
                            gameData.ameliorations?.gestionRessources?.prix || 800, 
                            gameData.ameliorations?.gestionRessources?.quantite || 0
                          ))}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterAmelioration('gestionRessources')}
                          disabled={!gameData.ameliorations?.gestionRessources?.debloque || 
                            gameData.fondsDispo < calculatePrice(
                              gameData.ameliorations?.gestionRessources?.prix || 800, 
                              gameData.ameliorations?.gestionRessources?.quantite || 0
                            )}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="ressources" className="max-h-[calc(100vh-25rem)] overflow-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Petite quantité d'argile */}
                    <Card>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Argile (10)</CardTitle>
                        <CardDescription className="text-xs">Achetez 10 unités</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(5000)}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterRessource('argile', 10, 5000)}
                          disabled={gameData.fondsDispo < 5000}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* Grande quantité d'argile */}
                    <Card>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Argile (50)</CardTitle>
                        <CardDescription className="text-xs">Achetez 50 unités</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(22500)}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterRessource('argile', 50, 22500)}
                          disabled={gameData.fondsDispo < 22500}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* Petite quantité d'eau */}
                    <Card>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Eau (10)</CardTitle>
                        <CardDescription className="text-xs">Achetez 10 unités</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(2500)}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterRessource('eau', 10, 2500)}
                          disabled={gameData.fondsDispo < 2500}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* Grande quantité d'eau */}
                    <Card>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Eau (50)</CardTitle>
                        <CardDescription className="text-xs">Achetez 50 unités</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-xs">
                          <span>Prix:</span>
                          <span>{formatGNF(10000)}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => acheterRessource('eau', 50, 10000)}
                          disabled={gameData.fondsDispo < 10000}
                        >
                          Acheter
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
} 