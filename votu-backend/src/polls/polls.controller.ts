import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreatePollDto } from './dto/create-poll.dto';
import { ListPollsQueryDto } from './dto/list-polls-query.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { PollsService } from './polls.service';

@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(
    @Query() query: ListPollsQueryDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.pollsService.findAll(query, req.user?.id);
  }

  @Get('/options/ref/:reference')
  findOptionByReference(@Param('reference') reference: string) {
    return this.pollsService.findOptionByReference(reference);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('ref/:reference')
  findByReference(
    @Param('reference') reference: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.pollsService.findOneByReference(reference, req.user?.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':pollId')
  findOne(
    @Param('pollId', ParseUUIDPipe) pollId: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.pollsService.findOne(pollId, req.user?.id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePollDto, @Request() req: { user: { id: string } }) {
    return this.pollsService.create(dto, req.user.id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':pollId')
  update(
    @Param('pollId', ParseUUIDPipe) pollId: string,
    @Body() dto: UpdatePollDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.pollsService.update(pollId, dto, req.user.id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':pollId/activate')
  activate(
    @Param('pollId', ParseUUIDPipe) pollId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.pollsService.activate(pollId, req.user.id);
  }
}
