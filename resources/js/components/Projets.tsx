import React from 'react';
import { Gift, Droplet, Layers, DollarSign, Zap, Star, Award, Truck, Cpu, Wrench, Sparkles, Package, Shield, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export interface ProjetType {
  id: number;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  effect: (applyProjet: (type: string, amount: number) => void) => void;
}

interface ProjetsProps {
  onRealize: (projet: ProjetType) => void;
  projets: ProjetType[];
}

export const projetsTypes: ProjetType[] = [
  {
    id: 1,
    name: "Système d'irrigation",
    description: "Ajoute 50 unités d'eau à l'usine",
    icon: <Droplet className="h-5 w-5" />,
    color: "text-blue-500",
    effect: (apply) => apply('eau', 50),
  },
  {
    id: 2,
    name: "Carrière d'argile",
    description: "Fournit 50 unités d'argile",
    icon: <Layers className="h-5 w-5" />,
    color: "text-amber-700",
    effect: (apply) => apply('argile', 50),
  },
  {
    id: 3,
    name: "Subvention de l'État",
    description: "Obtention de 100 000 GNF",
    icon: <DollarSign className="h-5 w-5" />,
    color: "text-green-600",
    effect: (apply) => apply('fondsDispo', 100000),
  },
  {
    id: 4,
    name: "Commande express",
    description: "Production immédiate de 20 briques",
    icon: <Zap className="h-5 w-5" />,
    color: "text-yellow-500",
    effect: (apply) => apply('briques', 20),
  },
  {
    id: 5,
    name: "Programme local de dons",
    description: "Recevoir 25 unités d'eau et 25 d'argile",
    icon: <Gift className="h-5 w-5" />,
    color: "text-purple-600",
    effect: (apply) => {
      apply('eau', 25);
      apply('argile', 25);
    },
  },
  {
    id: 6,
    name: "Investissement privé",
    description: "Obtention de 200 000 GNF",
    icon: <Star className="h-5 w-5" />,
    color: "text-amber-500",
    effect: (apply) => apply('fondsDispo', 200000),
  },
  {
    id: 7,
    name: "Ligne de production",
    description: "Production immédiate de 40 briques",
    icon: <Award className="h-5 w-5" />,
    color: "text-red-600",
    effect: (apply) => apply('briques', 40),
  },
  {
    id: 8,
    name: "Achat groupé d'argile",
    description: "Fournit 75 unités d'argile",
    icon: <Truck className="h-5 w-5" />,
    color: "text-amber-800",
    effect: (apply) => apply('argile', 75),
  },
  {
    id: 9,
    name: "Forage de puits",
    description: "Fournit 75 unités d'eau",
    icon: <Droplet className="h-5 w-5" />,
    color: "text-blue-600",
    effect: (apply) => apply('eau', 75),
  },
  {
    id: 10,
    name: "Programme d'optimisation",
    description: "30 briques produites et 50 000 GNF",
    icon: <Cpu className="h-5 w-5" />,
    color: "text-indigo-600",
    effect: (apply) => {
      apply('briques', 30);
      apply('fondsDispo', 50000);
    },
  },
  {
    id: 11,
    name: "Mise à niveau technique",
    description: "Obtention de 150 000 GNF",
    icon: <Wrench className="h-5 w-5" />,
    color: "text-slate-700",
    effect: (apply) => apply('fondsDispo', 150000),
  },
  {
    id: 12,
    name: "Campagne publicitaire",
    description: "100 000 GNF et 10 briques produites",
    icon: <Sparkles className="h-5 w-5" />,
    color: "text-pink-500",
    effect: (apply) => {
      apply('fondsDispo', 100000);
      apply('briques', 10);
    },
  },
  {
    id: 13,
    name: "Package d'aide humanitaire",
    description: "30 eau, 30 argile et 10 briques",
    icon: <Package className="h-5 w-5" />,
    color: "text-lime-600",
    effect: (apply) => {
      apply('eau', 30);
      apply('argile', 30);
      apply('briques', 10);
    },
  },
  {
    id: 14,
    name: "Système de collecte d'eau",
    description: "Fournit 100 unités d'eau",
    icon: <Cloud className="h-5 w-5" />,
    color: "text-sky-500",
    effect: (apply) => apply('eau', 100),
  },
  {
    id: 15,
    name: "Plan de développement",
    description: "25 briques, 50 000 GNF et 25 argile",
    icon: <Shield className="h-5 w-5" />,
    color: "text-teal-600",
    effect: (apply) => {
      apply('briques', 25);
      apply('fondsDispo', 50000);
      apply('argile', 25);
    },
  },
];

export const Projets: React.FC<ProjetsProps> = ({ 
  onRealize,
  projets
}) => {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium mb-2">Projets d'expansion de l'usine</div>
      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
        {projets.map((projet) => (
          <Card key={projet.id} className="shadow-sm">
            <CardHeader className="py-2 flex flex-row items-center space-x-2">
              <div className={`p-1.5 rounded-full ${projet.color.replace('text-', 'bg-')}`}>
                {React.cloneElement(projet.icon as React.ReactElement<React.SVGProps<SVGSVGElement>>, { className: 'h-4 w-4 text-white' })}
              </div>
              <div>
                <CardTitle className="text-sm">{projet.name}</CardTitle>
                <CardDescription className="text-xs">{projet.description}</CardDescription>
              </div>
            </CardHeader>
            <CardFooter className="pt-0 pb-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs" 
                onClick={() => onRealize(projet)}
              >
                Mettre en œuvre ce projet
              </Button>
            </CardFooter>
          </Card>
        ))}
        {projets.length === 0 && (
          <div className="text-center p-4 text-sm text-muted-foreground">
            Aucun projet d'expansion disponible pour le moment.
            <br />
            Revenez plus tard pour développer votre usine !
          </div>
        )}
      </div>
    </div>
  );
}; 