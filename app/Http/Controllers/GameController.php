<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GameController extends Controller
{
    /**
     * Affiche la page principale du jeu
     */
    public function index(): Response
    {
        // Initialisation des données de jeu ou récupération depuis la session
        $gameData = session('game_data', [
            'briques' => 0,
            'argile' => 100,
            'eau' => 100,
            'briquesManuelles' => 0,
            'briquesFabriquees' => 0,
            'fondsDispo' => 0,
            'etatJeu' => 'initial', // initial, production, automation, usine, expansion
            'progression' => 0,
            
            // Nouvelles données pour la gestion de la demande et du levier de production
            'demande' => [
                'niveau' => 100, // niveau de demande initial (100 = neutre, <100 = faible, >100 = forte)
                'tendance' => 0, // tendance de la demande (-1 = baisse, 0 = stable, 1 = hausse)
                'prixUnitaire' => 1500, // prix de base d'une brique en GNF (1500 GNF)
                'multiplicateurPrix' => 1.0, // multiplicateur de prix (influencé par la demande)
            ],
            'levier' => [
                'production' => 100, // niveau de production en pourcentage (100% = production normale)
                'coutArgile' => 1000.0, // coût unitaire en argile (peut varier selon le niveau de production)
                'coutEau' => 500.0, // coût unitaire en eau (peut varier selon le niveau de production)
                'efficacite' => 1.0, // efficacité de production (influence le rendement)
            ],
            
            // Événements économiques qui influencent le marché
            'evenements' => [
                'actif' => false, // Indique si un événement est actuellement actif
                'type' => null, // Type d'événement (saisonnier, économique, politique, etc.)
                'nom' => '', // Nom de l'événement
                'description' => '', // Description de l'événement
                'effetPrix' => 0, // Effet sur le prix (pourcentage: -30 à +50)
                'effetDemande' => 0, // Effet sur la demande (pourcentage: -30 à +50)
                'effetCoutProduction' => 0, // Effet sur les coûts de production (pourcentage: -20 à +40)
                'duree' => 0, // Durée en secondes
                'tempsRestant' => 0, // Temps restant en secondes
            ],
            
            // Générateurs automatiques de ressources
            'generateurs' => [
                'excavatrice' => [
                    'niveau' => 0,
                    'production' => 0.2, // Argile produite par seconde par niveau
                    'prixBase' => 300000, // Prix de base en GNF
                    'multiplicateurPrix' => 1.3, // Chaque niveau augmente le prix de 30%
                ],
                'irrigation' => [
                    'niveau' => 0,
                    'production' => 0.3, // Eau produite par seconde par niveau
                    'prixBase' => 250000, // Prix de base en GNF
                    'multiplicateurPrix' => 1.3, // Chaque niveau augmente le prix de 30%
                ],
                'recyclageBriques' => [
                    'niveau' => 0,
                    'production' => 0.05, // Argile et eau récupérées par seconde par niveau
                    'prixBase' => 600000, // Prix de base en GNF
                    'multiplicateurPrix' => 1.4, // Chaque niveau augmente le prix de 40%
                ],
            ],
            
            // Prix et stats des améliorations
            'ameliorations' => [
                'moules' => [
                    'quantite' => 0,
                    'prix' => 15000, // Prix en GNF
                    'production' => 0.5, // Briques supplémentaires par clic
                    'debloqueA' => 5, // Débloqué après X briques fabriquées
                    'debloque' => false,
                ],
                'ouvriers' => [
                    'quantite' => 0,
                    'prix' => 100000, // Prix en GNF
                    'production' => 1, // Briques par seconde
                    'debloqueA' => 50, // Débloqué après X briques fabriquées
                    'debloque' => false,
                ],
                'petiteUsine' => [
                    'quantite' => 0,
                    'prix' => 1000000, // Prix en GNF
                    'production' => 10, // Briques par seconde
                    'debloqueA' => 500, // Débloqué après X briques fabriquées
                    'debloque' => false,
                ],
                'grandeUsine' => [
                    'quantite' => 0,
                    'prix' => 10000000, // Prix en GNF
                    'production' => 100, // Briques par seconde
                    'debloqueA' => 5000, // Débloqué après X briques fabriquées
                    'debloque' => false,
                ],
                'etudeMarche' => [
                    'quantite' => 0,
                    'prix' => 500000, // Prix en GNF
                    'production' => 0, // Pas de production directe
                    'effet' => 'visibilite', // Débloque des informations sur la demande
                    'debloqueA' => 200, // Débloqué après X briques fabriquées
                    'debloque' => false,
                ],
                'optimisationProduction' => [
                    'quantite' => 0,
                    'prix' => 2000000, // Prix en GNF
                    'production' => 0, // Pas de production directe
                    'effet' => 'efficacite', // Améliore l'efficacité du levier de production
                    'debloqueA' => 1000, // Débloqué après X briques fabriquées
                    'debloque' => false,
                ],
                'gestionRessources' => [
                    'quantite' => 0,
                    'prix' => 800000, // Prix en GNF
                    'production' => 0, // Pas de production directe
                    'effet' => 'generateurs', // Débloque les générateurs automatiques de ressources
                    'debloqueA' => 300, // Débloqué après X briques fabriquées
                    'debloque' => false,
                ],
            ],
        ]);

        return Inertia::render('Game/Index', [
            'gameData' => $gameData
        ]);
    }

    /**
     * Met à jour les données du jeu (appelé par ajax)
     */
    public function update(Request $request): array
    {
        $gameData = $request->validate([
            'briques' => 'required|numeric',
            'argile' => 'required|numeric',
            'eau' => 'required|numeric',
            'briquesManuelles' => 'required|numeric',
            'briquesFabriquees' => 'required|numeric',
            'fondsDispo' => 'required|numeric',
            'etatJeu' => 'required|string',
            'progression' => 'required|numeric',
            'ameliorations' => 'required|array',
            'demande' => 'required|array',
            'levier' => 'required|array',
            'generateurs' => 'required|array',
            'evenements' => 'required|array',
        ]);

        // Sauvegarde des données du jeu en session
        session(['game_data' => $gameData]);

        return $gameData;
    }

    /**
     * Réinitialise le jeu
     */
    public function reset(): array
    {
        session()->forget('game_data');
        
        return [
            'success' => true,
            'message' => 'Jeu réinitialisé avec succès'
        ];
    }
} 