import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CastVoteDto } from './dto/cast-vote.dto';
import { ListVotesQueryDto } from './dto/list-votes-query.dto';
import { VotesService } from './votes.service';

@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Get()
  listVotes(@Query() query: ListVotesQueryDto) {
    return this.votesService.listVotes(query);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  castVote(@Body() dto: CastVoteDto, @Request() req: { user: { id: string } }) {
    return this.votesService.castVote(dto.pollId, dto, req.user.id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch()
  changeVote(
    @Body() dto: CastVoteDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.votesService.changeVote(dto.pollId, dto, req.user.id);
  }
}
