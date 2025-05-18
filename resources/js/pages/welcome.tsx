import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Cuboid, Layers, DollarSign, AlertTriangle, Gauge } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="BriquesAfrique - Jeu de gestion d'usine de briques en Guinée">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
            </Head>
            <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:p-8 dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <header className="mb-6 w-full max-w-6xl text-sm flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-primary flex items-center">
                        <Cuboid className="w-6 h-6 mr-2 text-amber-700" />
                        BriquesAfrique
                    </h1>
                    <nav className="flex items-center gap-4">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                            >
                                Tableau de bord
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#19140035] dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"
                                >
                                    Connexion
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                >
                                    Inscription
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                <main className="w-full max-w-6xl flex-grow flex flex-col space-y-8 py-8">
                    {/* Section d'introduction */}
                    <section className="text-center mb-8">
                        <h1 className="text-4xl font-bold mb-4">Bienvenue dans BriquesAfrique</h1>
                        <p className="text-xl max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
                            Un jeu incrémental de gestion d'usine de briques en Guinée
                        </p>
                        <div className="mt-8">
                            <Link href={route('game.index')} className="bg-amber-700 hover:bg-amber-800 text-white py-3 px-8 rounded-md text-lg font-medium inline-flex items-center">
                                <Cuboid className="w-5 h-5 mr-2" />
                                Commencer à jouer
                            </Link>
                        </div>
                    </section>

                    {/* Section explicative avec cartes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900 w-fit mb-2">
                                    <Cuboid className="w-6 h-6 text-amber-700 dark:text-amber-400" />
                                </div>
                                <CardTitle>Le concept du jeu</CardTitle>
                                <CardDescription>Développez votre usine de briques en Guinée</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">
                                    Gérez votre propre usine de briques en Guinée ! Commencez petit et développez progressivement
                                    votre production. Récoltez des ressources, fabriquez des briques, vendez-les sur le marché local
                                    et réinvestissez vos bénéfices pour agrandir votre entreprise.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 w-fit mb-2">
                                    <Layers className="w-6 h-6 text-blue-700 dark:text-blue-400" />
                                </div>
                                <CardTitle>Ressources et production</CardTitle>
                                <CardDescription>Collectez et transformez les matières premières</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">
                                    <strong>Matières premières :</strong> Argile et eau sont essentielles pour fabriquer des briques.
                                </p>
                                <p className="text-sm mt-2">
                                    <strong>Production :</strong> Cliquez pour fabriquer manuellement des briques ou investissez dans
                                    l'automatisation pour une production continue.
                                </p>
                                <p className="text-sm mt-2">
                                    <strong>Générateurs :</strong> Installez des systèmes d'extraction d'argile et d'irrigation pour
                                    obtenir automatiquement des ressources.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900 w-fit mb-2">
                                    <DollarSign className="w-6 h-6 text-green-700 dark:text-green-400" />
                                </div>
                                <CardTitle>Économie dynamique</CardTitle>
                                <CardDescription>Adaptez-vous au marché guinéen</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">
                                    <strong>Prix fluctuants :</strong> Le marché évolue constamment, influençant les prix de vente.
                                </p>
                                <p className="text-sm mt-2">
                                    <strong>Événements économiques :</strong> Faites face à divers événements (boom immobilier, crise
                                    économique, saison des pluies...) qui affectent les prix et la demande.
                                </p>
                                <p className="text-sm mt-2">
                                    <strong>Levier de production :</strong> Ajustez votre niveau de production pour trouver l'équilibre
                                    optimal entre rapidité et consommation de ressources.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section guide de jeu */}
                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle>Comment jouer ?</CardTitle>
                            <CardDescription>Guide du joueur débutant</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-medium mb-2">Débuter dans l'aventure</h3>
                                    <ol className="list-decimal list-inside space-y-2 text-sm">
                                        <li>Commencez par fabriquer manuellement des briques en cliquant sur le bouton principal</li>
                                        <li>Vendez vos briques pour gagner des francs guinéens (GNF)</li>
                                        <li>Achetez des améliorations de moules pour augmenter votre production par clic</li>
                                        <li>Investissez dans des ouvriers pour démarrer la production automatique</li>
                                        <li>Équilibrez vos ressources en achetant de l'argile et de l'eau si nécessaire</li>
                                    </ol>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium mb-2">Développer votre entreprise</h3>
                                    <ol className="list-decimal list-inside space-y-2 text-sm">
                                        <li>Débloquement progressif d'améliorations en fonction de votre production</li>
                                        <li>Construisez des petites puis grandes usines pour accélérer la production</li>
                                        <li>Investissez dans l'étude de marché pour anticiper les variations de prix</li>
                                        <li>Automatisez l'extraction des ressources avec des générateurs spécialisés</li>
                                        <li>Saisissez les opportunités offertes par les projets d'expansion</li>
                                    </ol>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-center">
                            <Link href={route('game.index')} className="bg-amber-700 hover:bg-amber-800 text-white py-2 px-6 rounded-md text-base font-medium inline-flex items-center">
                                Commencer l'aventure maintenant
                            </Link>
                        </CardFooter>
                    </Card>

                    {/* Section caractéristiques */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                            <Cuboid className="w-6 h-6 text-amber-700 mb-2" />
                            <h3 className="font-medium mb-1">Production de briques</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Transformez l'argile et l'eau en briques de qualité pour la construction.</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                            <Gauge className="w-6 h-6 text-blue-700 mb-2" />
                            <h3 className="font-medium mb-1">Optimisation</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Ajustez votre levier de production pour maximiser l'efficacité de votre usine.</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-yellow-600 mb-2" />
                            <h3 className="font-medium mb-1">Événements aléatoires</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Adaptez-vous aux événements économiques qui influencent le marché guinéen.</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                            <Layers className="w-6 h-6 text-green-700 mb-2" />
                            <h3 className="font-medium mb-1">Projets d'expansion</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Saisissez des opportunités de développement pour faire grandir votre entreprise.</p>
                        </div>
                    </div>
                </main>

                <footer className="w-full max-w-6xl py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>BriquesAfrique - Un jeu économique incrémental - Tous droits réservés</p>
                </footer>
            </div>
        </>
    );
}
