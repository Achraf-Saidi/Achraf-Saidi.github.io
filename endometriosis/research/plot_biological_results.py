#!/usr/bin/env python3
"""Rebuild scientific figures from published outputs; no web interface dependency."""
import argparse
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


def plot(directory):
    table = pd.read_csv(directory / 'all_genes.csv.gz', index_col=0)
    report = json.loads((directory / 'biological_results.json').read_text())
    fig, axes = plt.subplots(1, 3, figsize=(14, 4.5))
    ax = axes[0]
    ax.hexbin(table.rna_EC_EU_effect, table.array_EC_EU_effect,
              gridsize=50, mincnt=1, bins='log', cmap='viridis')
    ax.axhline(0, color='#888', lw=.6)
    ax.axvline(0, color='#888', lw=.6)
    ax.set(xlabel='RNA: mean paired log2(CPM+0.5) difference',
           ylabel='Array: mean paired processed-value difference',
           title=f"A. Lesion − eutopic, two cohorts\nSpearman ρ = {report['counts']['paired_delta_spearman_crossplatform']:.3f}")
    ax = axes[1]
    ax.hexbin(table.array_EC_EU_effect, table.array_NO_EU_effect,
              gridsize=50, mincnt=1, bins='log', cmap='viridis')
    ax.axhline(0, color='#888', lw=.6)
    ax.axvline(0, color='#888', lw=.6)
    ax.set(xlabel='Array: lesion − eutopic difference',
           ylabel='Array: adjacent ovary − eutopic difference',
           title=f"B. Adjacent ovarian tissue control\nSpearman ρ = {report['counts']['array_lesionEU_vs_adjacentovaryEU_spearman']:.3f}")
    # Illustrative familiar markers chosen AFTER analysis, not a validated target panel.
    markers = [g for g in ['ACTA2', 'ESR1', 'NGF'] if g in table.index]
    eu = pd.read_csv(directory / 'array_EC_EU_paired_deltas.csv.gz', index_col=0)
    no = pd.read_csv(directory / 'array_NO_EU_paired_deltas.csv.gz', index_col=0)
    ax = axes[2]
    for j, gene in enumerate(markers):
        ec_values, no_values = eu.loc[gene].values, no.loc[gene].values
        for i in range(len(ec_values)):
            ax.plot([j * 3, j * 3 + 1], [ec_values[i], no_values[i]], color='#bbc4c3', lw=.9)
        ax.scatter(np.full(len(ec_values), j * 3), ec_values, s=22, color='#306e6c', zorder=3)
        ax.scatter(np.full(len(no_values), j * 3 + 1), no_values, s=22, color='#b67835', zorder=3)
        ax.plot([j * 3, j * 3 + 1], [ec_values.mean(), no_values.mean()], color='black', lw=2)
    ax.axhline(0, color='#888', lw=.6)
    ax.set_xticks([j * 3 + .5 for j in range(len(markers))], markers)
    ax.set(ylabel='Processed-value difference relative to eutopic',
           title='C. Four paired array donors\nIllustrative markers, selected post-analysis')
    ax.scatter([], [], color='#306e6c', label='Lesion − eutopic')
    ax.scatter([], [], color='#b67835', label='Adjacent ovary − eutopic')
    ax.legend(fontsize=8, loc='lower left')
    for ax in axes:
        ax.tick_params(labelsize=8)
        for spine in ('top', 'right'):
            ax.spines[spine].set_visible(False)
    fig.suptitle(f"Ovarian endometriosis: {len(table):,} common genes, 8 RNA pairs and 4 array pairs", fontsize=13)
    fig.text(.5, .015, 'Descriptive reanalysis. No primary directional-conjunction BH discovery at 5%; no efficacy or causality inference.',
             ha='center', fontsize=8)
    fig.tight_layout(rect=[0, .04, 1, .93])
    fig.savefig(directory / 'paired_anatomy_figure.svg')
    fig.savefig(directory / 'paired_anatomy_figure.png', dpi=170)
    plt.close(fig)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--results', type=Path, required=True)
    args = parser.parse_args()
    plot(args.results)
